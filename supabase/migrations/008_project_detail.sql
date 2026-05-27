-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 008: Project Detail — extra velden + assignees + favorites
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Extra kolommen op projects ──────────────────────────────────────────

alter table public.projects
  add column if not exists prioriteit text not null default 'normaal'
    check (prioriteit in ('urgent', 'hoog', 'normaal', 'laag'));

alter table public.projects
  add column if not exists start_date date;


-- ─── 2. Project assignees (many-to-many) ────────────────────────────────────

create table if not exists public.project_assignees (
  project_id  uuid not null references public.projects(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (project_id, profile_id)
);

alter table public.project_assignees enable row level security;

create policy "Auth full access project_assignees"
  on public.project_assignees for all to authenticated using (true) with check (true);

create index if not exists project_assignees_profile_idx
  on public.project_assignees(profile_id);


-- ─── 3. Project favorites ───────────────────────────────────────────────────

create table if not exists public.project_favorites (
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.project_favorites enable row level security;

create policy "Auth full access project_favorites"
  on public.project_favorites for all to authenticated using (true) with check (true);
