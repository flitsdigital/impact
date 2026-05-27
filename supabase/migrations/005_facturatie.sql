-- ─── Extend klanten with billing fields ──────────────────────────────────────
-- (All columns are optional; existing rows keep NULL values)

alter table public.klanten
  add column if not exists contract_start_date  date,
  add column if not exists contract_end_date    date,
  add column if not exists billing_cycle        text
    check (billing_cycle in ('4_weeks', '6_weeks', 'monthly', 'custom')),
  add column if not exists custom_cycle_days    int,
  add column if not exists price_per_cycle      numeric,
  add column if not exists invoice_records      jsonb not null default '[]'::jsonb,
  add column if not exists project_budget       numeric,
  add column if not exists project_deadline     date;

-- ─── Klant facturen (project / one-off milestones) ───────────────────────────

create table if not exists public.klant_facturen (
  id              uuid primary key default gen_random_uuid(),
  klant_id        uuid not null references public.klanten(id) on delete cascade,
  label           text not null,                -- "Aanbetaling 50%", "Oplevering"
  amount          numeric not null,
  percentage      numeric,
  due_date        date not null,
  status          text not null default 'planned'
                    check (status in ('planned', 'sent', 'paid', 'overdue')),
  invoice_number  text,
  sent_at         timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.klant_facturen enable row level security;

create policy "Authenticated users full access on klant_facturen"
  on public.klant_facturen for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ─── updated_at trigger ───────────────────────────────────────────────────────

create trigger klant_facturen_updated_at
  before update on public.klant_facturen
  for each row execute function public.handle_updated_at();
