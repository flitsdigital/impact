# Implementatieplan — AI-assistent voor Flits CRM (Telegram + n8n + Claude)

> Status: ontwerp / spec. Nog geen code. Datum: 2026-06-15.
> Doel: vanaf je telefoon (spraak of tekst) acties uitvoeren in de CRM, te beginnen
> met het loggen van contactmomenten, uitbreidbaar naar leads, content en projecten.

## 1. Doel & scope

Je spreekt op je telefoon in:

> *"Hey, ik heb net Vince gebeld over de lead Hout, hij heeft nog geen antwoord gehad."*

Resultaat: er wordt automatisch een contactmoment aangemaakt bij lead **Hout**
(`type: gebeld`, `datum: vandaag`, `notitie: "Vince — nog geen antwoord gehad"`),
en je krijgt een bevestiging terug in de chat.

De assistent moet uitbreidbaar zijn naar de andere modules (leads, klanten,
content, projecten) zonder dat elke nieuwe mogelijkheid een nieuwe n8n-flow vereist.

**Niet in scope (v1):** spraak-uitvoer (TTS), meertalige UI, fijnmazige RBAC,
facturatie-acties.

## 2. Architectuur — splits "transport" en "brein"

```
 Telefoon (Telegram)                 n8n (transport)                 Next.js app (brein)
 ┌──────────────┐   voice/tekst   ┌──────────────────┐   POST text   ┌─────────────────────┐
 │  voice note  │ ──────────────▶ │ Telegram trigger │ ────────────▶ │ /api/assistant      │
 │  of bericht  │                 │ Whisper (STT)    │               │  Claude tool runner │
 │              │ ◀────────────── │ HTTP request     │ ◀──────────── │  tools → admin DB   │
 └──────────────┘  bevestiging    └──────────────────┘  reply text   └─────────────────────┘
```

- **n8n** = de "telefoon". Doet alleen: Telegram-bericht ontvangen → spraak
  transcriberen (Whisper-node) → tekst POSTen naar de app → het antwoord
  terugsturen in de chat. Geen AI-logica, geen DB.
- **Next.js route + Claude** = het "brein". Begrijpt de intentie, matcht de juiste
  entiteit, voert de juiste actie uit via een datalaag, en geeft een
  natuurlijke bevestigingszin terug.

**Waarom deze splitsing:** het brein zit náást de database, in getypte TypeScript,
en een nieuwe mogelijkheid = een nieuwe *tool* in de route — niet een nieuwe
n8n-workflow. Terugvragen/bevestigen werkt vanzelf omdat Telegram een chat is.

## 3. Identiteit & beveiliging (kritisch)

Een Telegram-bericht heeft géén ingelogde Supabase-sessie. Gevolgen:

1. **De route is server-to-server.** Beveilig hem met een gedeeld geheim
   (`ASSISTANT_WEBHOOK_SECRET`) in een header die n8n meestuurt. Zonder geldig
   geheim → 401. De route is verder niet publiek bruikbaar.
2. **De bestaande server actions kunnen niet 1-op-1 hergebruikt worden** — die
   roepen `requireAuth(supabase)` aan op de cookie-client, die hier ontbreekt.
   De assistent-tools draaien daarom via de **admin-client**
   (`lib/supabase/admin.ts`, service-role, omzeilt RLS) en zetten de
   handelende gebruiker (`author_id`, audit) expliciet op basis van een mapping.
   Ze hergebruiken wél de zod-schema's / validatievorm van de bestaande actions.
3. **Mapping Telegram-gebruiker → app-gebruiker** via een nieuwe tabel
   `assistant_identities`. Alleen Telegram-id's die hierin staan mogen acties
   uitvoeren (allowlist). Onbekende afzender → vriendelijke weigering.

Beveiligingsgrens = `ASSISTANT_WEBHOOK_SECRET` + de `assistant_identities`-allowlist.
Omdat de admin-client RLS omzeilt, mag de route nooit zonder beide door.

### Schemawijziging (minimaal)

Migratie `015_assistant.sql`:

```sql
-- Koppel een Telegram-gebruiker aan een CRM-profiel
create table public.assistant_identities (
  telegram_user_id text primary key,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  created_at       timestamptz default now() not null
);

-- Audit/debug van elke assistent-interactie (optioneel maar aanbevolen)
create table public.assistant_log (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid references public.profiles(id) on delete set null,
  input_text   text not null,
  reply_text   text,
  tool_calls   jsonb,          -- welke tools met welke argumenten
  created_at   timestamptz default now() not null
);

alter table public.assistant_identities enable row level security;
alter table public.assistant_log        enable row level security;
-- Alleen service-role (admin-client) schrijft; geen anon/auth policies nodig.
```

Voor de **kern** (contactmoment) zijn verder géén schemawijzigingen nodig —
`lead_contactmomenten` bestaat al.

## 4. De route — `app/api/assistant/route.ts`

`POST` route handler (Next.js 16, `RouteContext` niet nodig — geen dynamische param).

Flow per request:
1. Valideer `ASSISTANT_WEBHOOK_SECRET` (header). Mis → 401.
2. Lees `{ telegram_user_id, text }` uit de body.
3. Zoek `profile_id` in `assistant_identities`. Niet gevonden → 200 met een
   nette weigertekst ("Je bent nog niet gekoppeld aan een account.").
4. Draai Claude met de tool runner (`@anthropic-ai/sdk`), model `claude-opus-4-8`,
   `output_config: { effort: "high" }`, adaptive thinking. Systeemprompt bevat:
   de huidige datum, de naam van de handelende gebruiker, en de gedragsregels (§6).
5. Tools voeren acties uit via de admin-datalaag, met `actingProfileId = profile_id`.
6. Schrijf `assistant_log`.
7. Geef de eind-tekst van Claude terug als `{ reply }`. n8n stuurt die naar Telegram.

De **tool runner** handelt de hele tool-loop zelf af (geen handmatige loop nodig).
Elke tool is een dunne wrapper (zod-input + admin-client query). Tools zijn
groepeerbaar per module; de set is uitbreidbaar zonder de route te herstructureren.

## 5. Tool-registry (per module, gekoppeld aan bestaande logica)

Elke tool = naam + beschrijving (prescriptief: *wanneer* aanroepen) + zod-schema +
`run()`. De `run()` gebruikt de admin-client en, waar van toepassing, `actingProfileId`.

### Leads (v1-kern)
| Tool | Mapt op | Notitie |
|---|---|---|
| `find_lead(query)` | `leads` fuzzy op `bedrijfsnaam`/`contactpersoon` | geeft kandidaten terug; basis voor disambiguatie |
| `log_contactmoment(lead_id, type, datum?, notitie)` | bestaande `addContactmoment`-vorm | `type ∈ gebeld\|gemaild\|meeting\|notitie`; `author_id = actingProfileId`; `datum` default vandaag |
| `update_lead_status(lead_id, status)` | `updateLead`-vorm | `status ∈ nieuw\|contact\|offerte\|gewonnen\|verloren` — **bevestiging vereist** |
| `create_lead(bedrijfsnaam, …)` | `createLead`-vorm | optioneel in v1 |

### Klanten
| Tool | Mapt op | Notitie |
|---|---|---|
| `find_klant(query)` | `klanten` fuzzy op `naam` | |
| `append_klant_notitie(klant_id, tekst)` | `updateKlant` (`notities`) | klanten hebben **geen** contactmomenten-tabel; we appenden aan het `notities`-veld met datumprefix. (Optie: later een `klant_contactmomenten`-tabel — zie §10.) |

### Content (posts)
| Tool | Mapt op | Notitie |
|---|---|---|
| `find_post(query)` | `posts` + `klanten(naam)` | match op klant/caption/datum |
| `create_post(klant_id?, type, caption?, scheduled_at?)` | `createPost`-vorm | `type ∈ foto\|video\|reel\|carousel`; media gaat niet via spraak |
| `update_post_status(post_id, status)` | `updatePostStatus` | `status ∈ te_doen\|bezig\|klaar_voor_feedback\|akkoord\|gepost`; schrijft `post_logs` |
| `reschedule_post(post_id, datum)` | `updatePostDate` | |
| `draft_caption(brief)` | (puur Claude) | geeft alleen een voorstel terug, schrijft niets |

### Projecten
| Tool | Mapt op | Notitie |
|---|---|---|
| `find_project(query)` | `projects` + `klanten(naam)` | |
| `create_task(project_id, titel, beschrijving?, deadline?, prioriteit?)` | `createTask`-vorm | |
| `update_task_status(task_id, status)` | `updateTask`/`moveTask` | `status ∈ todo\|bezig\|feedback\|klaar` |
| `add_task_comment(task_id, inhoud)` | `addComment` | `author_id = actingProfileId` |
| `create_project(naam, klant_id?, deadline?)` | `createProject`-vorm | **bevestiging vereist** (zwaardere actie) |

### Cross-cutting
| Tool | Notitie |
|---|---|
| `query(question)` | Alleen-lezen antwoord ("wat is de status van klant Hout?", "welke leads heb ik deze week nog niet gesproken?"). Leest via admin-client, schrijft nooit. |

## 6. Gedragsregels (in de systeemprompt)

- **Disambiguatie:** als `find_*` meerdere kandidaten geeft, vraag terug in de chat
  i.p.v. te gokken. (Telegram is een chat → volgende bericht is het antwoord.)
- **Lichte, omkeerbare actie** (contactmoment, comment, notitie) → direct uitvoeren
  en bevestigen. Bevestigingsvorm:
  *"✅ Genoteerd bij lead **Hout**: 'Vince — nog geen antwoord gehad' (gebeld, 15 jun)."*
- **Onomkeerbaar / impactvol** (status → `verloren`, project aanmaken, iets
  verwijderen) → **eerst om bevestiging vragen**, pas uitvoeren na "ja".
- **Niets gevonden** → zeg dat, gok geen entiteit.
- Antwoord kort, in het Nederlands.

## 7. n8n-flow (Telegram)

Nodes:
1. **Telegram Trigger** — op nieuw bericht (tekst of voice).
2. **If voice** → **Telegram (get file)** → **OpenAI Whisper / transcribe** → tekst.
   Bij tekstbericht: gebruik de tekst direct.
3. **HTTP Request** → `POST {APP_URL}/api/assistant` met header
   `x-assistant-secret: {{ASSISTANT_WEBHOOK_SECRET}}` en body
   `{ telegram_user_id: {{from.id}}, text: {{transcript}} }`.
4. **Telegram (send message)** → stuur `{{ $json.reply }}` terug naar de chat.

Conversatie/terugvragen werkt omdat elke beurt opnieuw door dezelfde flow gaat;
de route is per beurt stateless (context per beurt is voldoende voor v1 — zie §10
voor meerdere-beurten-geheugen).

## 8. Fasering

| Fase | Inhoud | Bewijst |
|---|---|---|
| **v1** | `015_assistant.sql` + route + n8n-flow + tools `find_lead`, `log_contactmoment`. Jouw voorbeeld end-to-end, met disambiguatie + bevestiging. | de hele keten werkt |
| **v2** | `update_lead_status`, `query` (alleen-lezen), bevestigingsregel voor onomkeerbare acties. | redeneren + veilig schrijven |
| **v3** | Content-tools (`create_post`, `update_post_status`, `reschedule_post`, `draft_caption`) + projecten-tools (`create_task`, `update_task_status`, `add_task_comment`). | breedte over modules |
| **v4 (proactief)** | n8n-cron → `query`-achtige briefing ("3 leads >7 dagen geen contact"); inkomende e-mail → classificatie → lead/contactmoment. | assistent praat terug uit zichzelf |

## 9. Model & kosten

- **Brein:** `claude-opus-4-8`, tool runner, `effort: "high"`, adaptive thinking.
- **Goedkope classificatie** (v4 e-mail-routing): `claude-haiku-4-5`.
- **Transcriptie:** Whisper-node in n8n (app krijgt alleen tekst).
- Volume is laag (enkele tool-calls per bericht) → kosten verwaarloosbaar.
- Zet de `ANTHROPIC_API_KEY` als env var in de app (niet in n8n).

## 10. Open vragen / latere keuzes

- **Klant-contactmomenten:** klanten hebben nu alleen een `notities`-veld. v1 appendt
  daaraan; als je echte contactmomenten op klanten wilt (zoals bij leads), is een
  `klant_contactmomenten`-tabel nodig (aparte change).
- **Meerdere-beurten-geheugen:** v1 is per beurt stateless. Voor langere dialogen
  (meerdere terugvragen) kunnen we de laatste N berichten per Telegram-chat
  meesturen of een korte sessiestatus bewaren. Pas bouwen als v1 het nodig blijkt.
- **Meerdere gebruikers/teamleden:** allowlist in `assistant_identities` schaalt
  mee; elk teamlid koppelt zijn eigen Telegram-id.

## 11. Beveiliging & privacy

- Route alleen via `ASSISTANT_WEBHOOK_SECRET`; allowlist via `assistant_identities`.
- Admin-client omzeilt RLS → de route is de enige plek met service-role; goed
  afschermen, nooit het geheim of de key naar n8n lekken (n8n stuurt alleen het
  webhook-secret mee, niet de Supabase service-role key).
- `assistant_log` bewaart inputtekst — handig voor debug, maar bevat klantdata;
  bepaal een bewaartermijn.

## 12. Acceptatiecriteria (v1)

1. Spraakbericht "ik heb Vince gebeld over lead Hout, nog geen antwoord" →
   contactmoment bij lead Hout met `type: gebeld`, `notitie` ~ "Vince — nog geen
   antwoord", `datum` vandaag, `author_id` = gekoppelde gebruiker.
2. Bevestiging komt terug in Telegram.
3. Twee leads die op "Hout" matchen → de assistent vraagt welke, en logt pas na keuze.
4. Onbekende Telegram-afzender → nette weigering, geen schrijfactie.
5. Het contactmoment verschijnt in de timeline op de lead-detailpagina.
```
