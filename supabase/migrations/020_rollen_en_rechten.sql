-- ─── Granulaire rechten: rollen, per-feature niveaus, per-gebruiker uitzonderingen ───
-- Vereist migratie 003 (profiles). Single-tenant: één bedrijf, alle profiles = collega's.
-- Niveau per feature: 0 geen · 1 bekijken · 2 bewerken · 3 beheren.
-- Veilig her-uitvoerbaar (if not exists / drop policy if exists / create or replace).

-- ─── Rollen ───────────────────────────────────────────────────────────────────
create table if not exists public.roles (
  id          text        primary key,
  name        text        not null,
  description text,
  is_system   boolean     not null default true,
  sort        int         not null default 0
);

insert into public.roles (id, name, description, is_system, sort) values
  ('beheerder', 'Beheerder',    'Volledige toegang tot alles, inclusief rechtenbeheer', true, 1),
  ('manager',   'Manager',      'Stuurt het werk aan, geen systeeminstellingen',        true, 2),
  ('lid',       'Lid',          'Werkt mee aan klanten, content en projecten',          true, 3),
  ('lezer',     'Alleen lezen', 'Bekijkt alles, wijzigt niets',                         true, 4)
on conflict (id) do update set
  name = excluded.name, description = excluded.description, sort = excluded.sort;

-- ─── Rol → feature → niveau ───────────────────────────────────────────────────
create table if not exists public.role_permissions (
  role       text        not null references public.roles(id) on delete cascade,
  feature    text        not null,
  level      smallint    not null default 0 check (level between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (role, feature)
);

-- Seed (komt overeen met ROLE_SEED in lib/permissions.ts).
-- Features: dashboard, projecten, taken, content, klanten, leads, facturatie, gebruikers, instellingen.
insert into public.role_permissions (role, feature, level) values
  -- beheerder: alles beheren
  ('beheerder','dashboard',3),('beheerder','projecten',3),('beheerder','taken',3),
  ('beheerder','content',3),('beheerder','klanten',3),('beheerder','leads',3),
  ('beheerder','facturatie',3),('beheerder','gebruikers',3),('beheerder','instellingen',3),
  -- manager
  ('manager','dashboard',1),('manager','projecten',3),('manager','taken',3),
  ('manager','content',3),('manager','klanten',3),('manager','leads',3),
  ('manager','facturatie',2),('manager','gebruikers',1),('manager','instellingen',0),
  -- lid
  ('lid','dashboard',1),('lid','projecten',2),('lid','taken',2),
  ('lid','content',2),('lid','klanten',2),('lid','leads',1),
  ('lid','facturatie',1),('lid','gebruikers',0),('lid','instellingen',0),
  -- lezer
  ('lezer','dashboard',1),('lezer','projecten',1),('lezer','taken',1),
  ('lezer','content',1),('lezer','klanten',1),('lezer','leads',1),
  ('lezer','facturatie',1),('lezer','gebruikers',0),('lezer','instellingen',0)
on conflict (role, feature) do nothing;

-- ─── Per-gebruiker uitzonderingen ─────────────────────────────────────────────
create table if not exists public.user_permission_overrides (
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  feature    text        not null,
  level      smallint    not null check (level between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature)
);

-- ─── profiles.role ────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists role text not null default 'lid' references public.roles(id);

-- Bestaande gebruikers waren tot nu toe effectief beheerder → niemand buitensluiten.
update public.profiles set role = 'beheerder' where role = 'lid';

-- ─── Helper: is de huidige gebruiker beheerder? ───────────────────────────────
-- SECURITY DEFINER leest profiles zonder RLS → geen recursie in profiles-policies.
create or replace function public.is_beheerder()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'beheerder'
  );
$$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table public.roles                     enable row level security;
alter table public.role_permissions          enable row level security;
alter table public.user_permission_overrides enable row level security;

-- Iedereen die is ingelogd mag rollen/rechten lezen (nodig voor gating + admin-UI).
drop policy if exists "roles readable" on public.roles;
create policy "roles readable" on public.roles
  for select to authenticated using (true);

drop policy if exists "roles writable by beheerder" on public.roles;
create policy "roles writable by beheerder" on public.roles
  for all to authenticated using (public.is_beheerder()) with check (public.is_beheerder());

drop policy if exists "role_permissions readable" on public.role_permissions;
create policy "role_permissions readable" on public.role_permissions
  for select to authenticated using (true);

drop policy if exists "role_permissions writable by beheerder" on public.role_permissions;
create policy "role_permissions writable by beheerder" on public.role_permissions
  for all to authenticated using (public.is_beheerder()) with check (public.is_beheerder());

drop policy if exists "overrides readable" on public.user_permission_overrides;
create policy "overrides readable" on public.user_permission_overrides
  for select to authenticated using (true);

drop policy if exists "overrides writable by beheerder" on public.user_permission_overrides;
create policy "overrides writable by beheerder" on public.user_permission_overrides
  for all to authenticated using (public.is_beheerder()) with check (public.is_beheerder());

-- Beheerder mag elk profiel bewerken (rol toewijzen); bestaande "update own" blijft.
drop policy if exists "beheerder updates any profile" on public.profiles;
create policy "beheerder updates any profile" on public.profiles
  for update to authenticated using (public.is_beheerder()) with check (public.is_beheerder());

-- ─── Voorkom rol-escalatie: alleen beheerder (of service-role) mag role wijzigen ──
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null          -- service-role (geen sessie) mag wel
     and not public.is_beheerder() then
    raise exception 'Alleen een beheerder mag rollen wijzigen';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ─── handle_new_user uitbreiden: rol uit invite-metadata meenemen ─────────────
-- Rol wordt alleen bij INSERT gezet (uit raw_user_meta_data.role, default 'lid');
-- bij latere auth-updates blijft de admin-ingestelde rol behouden.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'lid')
  )
  on conflict (id) do update set
    full_name  = excluded.full_name,
    avatar_url = excluded.avatar_url,
    email      = excluded.email,
    updated_at = now();   -- role bewust NIET overschreven
  return new;
end;
$$;

-- ─── updated_at triggers (hergebruikt update_updated_at uit migratie 002) ──────
drop trigger if exists role_permissions_updated_at on public.role_permissions;
create trigger role_permissions_updated_at
  before update on public.role_permissions
  for each row execute function public.update_updated_at();

drop trigger if exists overrides_updated_at on public.user_permission_overrides;
create trigger overrides_updated_at
  before update on public.user_permission_overrides
  for each row execute function public.update_updated_at();
