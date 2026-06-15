-- ─── AI-assistent (Telegram → n8n → /api/assistant) ─────────────────────────
-- Koppeling van een Telegram-gebruiker aan een CRM-profiel (allowlist) +
-- audit van elke assistent-interactie. Alleen de service-role (admin-client)
-- schrijft hierin; er zijn bewust geen anon/auth policies.

create table public.assistant_identities (
  telegram_user_id text primary key,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  label            text,                 -- vrij veld, bv. "Jordi telefoon"
  created_at       timestamptz default now() not null
);

create table public.assistant_log (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles(id) on delete set null,
  input_text  text not null,
  reply_text  text,
  tool_calls  jsonb,                     -- [{ name, input }]
  created_at  timestamptz default now() not null
);

alter table public.assistant_identities enable row level security;
alter table public.assistant_log        enable row level security;
-- Geen policies: alleen de service-role (bypass RLS) leest/schrijft.
