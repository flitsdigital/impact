-- ─── Lead: dienst-type + meerdere toegewezen teamleden ───────────────────────

alter table public.leads
  add column if not exists dienst text
    check (dienst in ('social', 'website', 'webshop', 'branding'));

create table if not exists public.lead_assignees (
  lead_id    uuid not null references public.leads(id)    on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (lead_id, user_id)
);

alter table public.lead_assignees enable row level security;

drop policy if exists "Auth full access lead_assignees" on public.lead_assignees;
create policy "Auth full access lead_assignees"
  on public.lead_assignees for all to authenticated
  using (true) with check (true);
