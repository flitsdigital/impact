create table public.klanten (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  type text not null default 'recurring' check (type in ('recurring', 'project', 'one-off')),
  contactpersoon text,
  status text not null default 'actief' check (status in ('actief', 'gepauzeerd', 'gearchiveerd')),
  volgende_factuur date,
  email text,
  telefoon text,
  website text,
  notities text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.klanten enable row level security;

create policy "Users can view klanten"
  on public.klanten for select to authenticated using (true);

create policy "Users can insert klanten"
  on public.klanten for insert to authenticated with check (true);

create policy "Users can update klanten"
  on public.klanten for update to authenticated using (true);

create policy "Users can delete klanten"
  on public.klanten for delete to authenticated using (true);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_klanten_updated
  before update on public.klanten
  for each row execute procedure public.handle_updated_at();
