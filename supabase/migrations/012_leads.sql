-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 012: Leads & contactmomenten
-- Vereisten: migration 003 (profiles) moet al bestaan.
-- Idempotent: veilig opnieuw uitvoeren.
-- ══════════════════════════════════════════════════════════════════════════════


-- ─── 1. Leads ─────────────────────────────────────────────────────────────────

create table if not exists public.leads (
  id              uuid        primary key default gen_random_uuid(),
  bedrijfsnaam    text        not null,
  contactpersoon  text,
  email           text,
  telefoon        text,
  bron            text        not null default 'overig'
                                check (bron in ('website', 'referral', 'outbound', 'overig')),
  waarde          numeric,
  notities        text,
  status          text        not null default 'nieuw'
                                check (status in ('nieuw', 'contact', 'offerte', 'gewonnen', 'verloren')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads (status);


-- ─── 2. Contactmomenten ───────────────────────────────────────────────────────

create table if not exists public.lead_contactmomenten (
  id          uuid        primary key default gen_random_uuid(),
  lead_id     uuid        not null references public.leads(id) on delete cascade,
  author_id   uuid        references public.profiles(id) on delete set null,
  type        text        not null default 'notitie'
                            check (type in ('gebeld', 'gemaild', 'meeting', 'notitie')),
  datum       date        not null default current_date,
  notitie     text,
  created_at  timestamptz not null default now()
);

create index if not exists lead_contactmomenten_lead_idx
  on public.lead_contactmomenten (lead_id, datum desc);


-- ─── 3. updated_at trigger ────────────────────────────────────────────────────
-- Hergebruikt public.handle_updated_at() uit migration 001.

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute procedure public.handle_updated_at();


-- ─── 4. RLS ───────────────────────────────────────────────────────────────────

alter table public.leads                enable row level security;
alter table public.lead_contactmomenten enable row level security;

-- Alle ingelogde teamleden hebben volledig toegang
drop policy if exists "Auth full access leads" on public.leads;
create policy "Auth full access leads"
  on public.leads for all to authenticated using (true) with check (true);

drop policy if exists "Auth full access lead_contactmomenten" on public.lead_contactmomenten;
create policy "Auth full access lead_contactmomenten"
  on public.lead_contactmomenten for all to authenticated using (true) with check (true);
