# Realtime sync — geen handmatige refresh meer

**Datum:** 2026-06-18
**Status:** ontwerp, wacht op review

## Probleem

Pages zijn Server Components die data via `lib/supabase/server` ophalen en als props
doorgeven aan client-modules (`TakenModule`, `ContentModule`, `LeadsModule`). Mutaties
gebeuren client-side, maar er is geen live sync. Wanneer een teammate of de AI-assistant
(via de REST-API / admin-client) iets aanpast, ziet de gebruiker dat pas na een handmatige
page-refresh.

## Doel

Wijzigingen van teammates én de assistant verschijnen automatisch in de UI van de
kernmodules — Taken, Content/Posts en Leads — zonder handmatig te refreshen.

## Aanpak

Realtime-events triggeren `router.refresh()`. Next re-runt de bestaande server-fetch en de
nieuwe data stroomt als props naar de client-modules. Geen aparte client-state, geen
duplicatie van fetch/merge-logica.

Afgewogen alternatief — het realtime-payload chirurgisch in zustand-state patchen — is
bewust niet gekozen: veel meer code, dupliceert de server-side merge-logica, grotere
bugkans. Toe te voegen als `router.refresh()` merkbaar traag voelt.

## Componenten

### 1. Hook — `lib/supabase/useRealtimeRefresh.ts` (nieuw)

```ts
'use client'
useRealtimeRefresh(['tasks', 'task_comments'])
```

- Maakt de browser-client (`lib/supabase/client`), opent één channel met `postgres_changes`
  op de meegegeven tabellen (schema `public`, event `*`).
- Bij elk event → **debounced** `router.refresh()` (~250ms), zodat een bulk-write van de
  assistant resulteert in één refresh i.p.v. tien.
- Bij (her)verbinden (`SUBSCRIBED`-status na reconnect): één refresh om events gemist tijdens
  de disconnect alsnog op te halen.
- Cleanup: `supabase.removeChannel(...)` bij unmount.

~30 regels. Tabellen-array is een prop zodat de hook herbruikbaar is.

### 2. Inpluggen — één regel per module

| Module          | Tabellen                                   |
| --------------- | ------------------------------------------ |
| `TakenModule`   | `tasks`, `task_comments`                   |
| `ContentModule` | `posts`, `post_logs`, `post_assignees`     |
| `LeadsModule`   | `leads`, `lead_contactmomenten`            |

### 3. DB-migratie — realtime-publication

`tasks`, `task_comments`, `project_activity` zitten al in `supabase_realtime`. Toevoegen:

```sql
alter publication supabase_realtime add table
  public.posts, public.post_logs, public.post_assignees,
  public.leads, public.lead_contactmomenten;
```

## RLS

Geverifieerd op 2026-06-18: alle betrokken tabellen hebben RLS aan met full access voor de
`authenticated`-rol. Realtime levert `postgres_changes`-events alleen voor rijen die de
ingelogde gebruiker mag SELECT-en — dat geldt hier voor alle rijen. De browser-client van
`@supabase/ssr` is authenticated, dus events komen door. Geen extra policy-werk nodig.

De assistant/server-actions schrijven via de admin-client (service-role); die writes
genereren gewoon Postgres-changes waar de subscribers events van krijgen.

## Bewust weggelaten (YAGNI)

- **Presence** ("wie kijkt er mee") — toevoegen wanneer je dat wilt tonen.
- **Surgical state-patching / optimistic UI** — toevoegen als de refresh traag voelt.
- **Toast "teammate heeft X gewijzigd"** — later, bovenop dezelfde events.
- **Overige modules** (projecten, klanten, dashboard, timeline) — zelfde hook uitrollen
  wanneer gewenst; één regel + tabel in de publication per module.

## Testen

Realtime zelf is integratie-werk, niet zinvol te unit-testen. De debounce-helper is wel
los testbaar. Handmatige verificatie: twee browsers / een assistant-write naast een open
sessie → wijziging verschijnt binnen ~1s zonder refresh.
