# Flits Impact CRM

Intern agency-CRM voor Flits Digital — klanten, content (social media), facturatie,
leads en projecten in één tool. Next.js (App Router) + Supabase, gebouwd op een
eigen design-system (donker thema).

## Stack

- **Next.js 16** (App Router, server actions) + React 19 + TypeScript
- **Supabase** — Postgres, Auth, Storage, RLS
- **Tailwind CSS v4** op design-tokens (zie `docs/DESIGN-SYSTEM.md` + `/design-system`)
- **Zustand** (auth/sidebar state), **React Hook Form + Zod** (forms), **Sonner** (toasts)
- **AI-assistent** via OpenAI-compatibele chat-API (default Groq), aangestuurd vanuit
  Telegram → n8n → `/api/assistant`

Pakketbeheer: **pnpm** (v10). Eén lockfile: `pnpm-lock.yaml`.

## Setup

```bash
pnpm install
cp .env.example .env.local   # vul de waarden in (zie hieronder)
pnpm dev                     # http://localhost:3000
```

### Environment-variabelen (`.env.local`)

| Variabele | Nodig voor |
|-----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-project (browser + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase auth/queries als ingelogde gebruiker |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: publieke `/preview`-pagina, AI-assistent, instellingen-logboek. **Nooit in de browser.** |
| `AI_API_KEY` | AI-assistent (Groq-sleutel `gsk_…`, of OpenAI/Gemini) |
| `AI_BASE_URL` | AI-provider-endpoint (default Groq) |
| `AI_MODEL` | Model (default `llama-3.3-70b-versatile`) |
| `ASSISTANT_WEBHOOK_SECRET` | Gedeeld geheim dat n8n meestuurt als `x-assistant-secret` |

De service-role-key vind je in Supabase → Project Settings → API → `service_role`.

### Database

SQL-migraties staan in `supabase/migrations/` (genummerd). Toepassen via
`supabase db push` of de SQL-editor in het dashboard.

## Scripts

```bash
pnpm dev          # dev-server
pnpm build        # productie-build
pnpm start        # productie-server (na build)
pnpm test         # vitest (unit tests in lib/)
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
```

## Structuur

```
app/(app)/        ingelogde modules (dashboard, klanten, content, leads, projecten, …)
app/(auth)/       login + wachtwoordherstel
app/api/          route handlers (assistant + posts)
app/preview/      publieke post-preview (service-role, geen sessie)
components/ui/    design-system-atomen — hergebruik vóór je nieuw bouwt
lib/              supabase-clients, datum-/valuta-helpers, assistant-logica
supabase/migrations/  database-schema (RLS aan)
```

## Conventies

Zie `AGENTS.md` + `docs/DESIGN-SYSTEM.md`: altijd Tailwind-classes op tokens
(`bg-bg-2`, `text-fg-3`, …), datums via `lib/dates`, valuta via `lib/format`,
en hergebruik bestaande atomen uit `components/ui/`.
