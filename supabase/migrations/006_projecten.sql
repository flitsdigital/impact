-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 006: Projecten & Taken
-- Vereisten: migrations 001 (klanten) en 003 (profiles) moeten al bestaan.
-- Idempotent: veilig opnieuw uitvoeren.
-- ══════════════════════════════════════════════════════════════════════════════


-- ─── 1. Projects ──────────────────────────────────────────────────────────────

create table if not exists public.projects (
  id              uuid        primary key default gen_random_uuid(),
  klant_id        uuid        references public.klanten(id) on delete set null,
  naam            text        not null,
  beschrijving    text,
  status          text        not null default 'actief'
                                check (status in ('actief', 'gepauzeerd', 'voltooid', 'gearchiveerd')),
  kleur           text        not null default '#5B5BD6',
  budget          numeric,
  gefactureerd    numeric     not null default 0,
  deadline        date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);


-- ─── 2. Project labels ────────────────────────────────────────────────────────

create table if not exists public.project_labels (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  naam        text        not null,
  kleur       text        not null default '#5B5BD6',
  created_at  timestamptz not null default now()
);


-- ─── 3. Sprints ───────────────────────────────────────────────────────────────

create table if not exists public.sprints (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  naam        text        not null,
  start_date  date,
  end_date    date,
  status      text        not null default 'gepland'
                            check (status in ('gepland', 'actief', 'voltooid')),
  created_at  timestamptz not null default now()
);


-- ─── 4. Milestones ────────────────────────────────────────────────────────────

create table if not exists public.milestones (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  naam        text        not null,
  beschrijving text,
  kleur       text        not null default '#5B5BD6',
  datum       date,
  volgorde    int         not null default 0,
  voltooid    boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ─── 5. Tasks ─────────────────────────────────────────────────────────────────

-- Globale taaknummer-reeks (FLT-001, FLT-002, …)
create sequence if not exists public.task_number_seq start 1;

create table if not exists public.tasks (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null references public.projects(id) on delete cascade,
  sprint_id       uuid        references public.sprints(id)    on delete set null,
  milestone_id    uuid        references public.milestones(id) on delete set null,
  parent_id       uuid        references public.tasks(id)      on delete cascade,
  task_number     int         not null default nextval('public.task_number_seq'),
  titel           text        not null,
  beschrijving    text,
  status          text        not null default 'todo'
                                check (status in ('todo', 'bezig', 'feedback', 'klaar')),
  prioriteit      text        not null default 'normaal'
                                check (prioriteit in ('urgent', 'hoog', 'normaal', 'laag')),
  start_date      date,
  deadline        date,
  schatting_uren  numeric,
  gelogde_uren    numeric     not null default 0,
  volgorde        int         not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);


-- ─── 6. Task assignees (many-to-many) ─────────────────────────────────────────

create table if not exists public.task_assignees (
  task_id     uuid not null references public.tasks(id)    on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (task_id, profile_id)
);


-- ─── 7. Task labels (many-to-many) ───────────────────────────────────────────

create table if not exists public.task_labels (
  task_id   uuid not null references public.tasks(id)          on delete cascade,
  label_id  uuid not null references public.project_labels(id) on delete cascade,
  primary key (task_id, label_id)
);


-- ─── 8. Task comments ─────────────────────────────────────────────────────────

create table if not exists public.task_comments (
  id          uuid        primary key default gen_random_uuid(),
  task_id     uuid        not null references public.tasks(id)    on delete cascade,
  author_id   uuid        references public.profiles(id)          on delete set null,
  inhoud      text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ─── 9. Project activity log ──────────────────────────────────────────────────

create table if not exists public.project_activity (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  task_id     uuid        references public.tasks(id)             on delete cascade,
  actor_id    uuid        references public.profiles(id)          on delete set null,
  actie       text        not null,
  -- actie waarden: 'task_created' | 'task_deleted' | 'status_changed'
  --               | 'assigned' | 'commented' | 'sprint_changed' | 'priority_changed'
  meta        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);


-- ══════════════════════════════════════════════════════════════════════════════
-- Indexes
-- ══════════════════════════════════════════════════════════════════════════════

create index if not exists tasks_project_id_idx      on public.tasks(project_id);
create index if not exists tasks_parent_id_idx       on public.tasks(parent_id);
create index if not exists tasks_sprint_id_idx       on public.tasks(sprint_id);
create index if not exists tasks_milestone_id_idx    on public.tasks(milestone_id);
create index if not exists tasks_status_idx          on public.tasks(status);
create index if not exists tasks_volgorde_idx        on public.tasks(project_id, status, volgorde);

create index if not exists task_assignees_profile_idx on public.task_assignees(profile_id);
create index if not exists task_labels_label_idx      on public.task_labels(label_id);
create index if not exists task_comments_task_idx     on public.task_comments(task_id);
create index if not exists project_activity_proj_idx  on public.project_activity(project_id);
create index if not exists project_labels_proj_idx    on public.project_labels(project_id);
create index if not exists milestones_proj_idx        on public.milestones(project_id, volgorde);
create index if not exists sprints_proj_idx           on public.sprints(project_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.projects         enable row level security;
alter table public.project_labels   enable row level security;
alter table public.sprints          enable row level security;
alter table public.milestones       enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_assignees   enable row level security;
alter table public.task_labels      enable row level security;
alter table public.task_comments    enable row level security;
alter table public.project_activity enable row level security;

-- Alle ingelogde teamleden hebben volledig toegang
create policy "Auth full access projects"
  on public.projects for all to authenticated using (true) with check (true);

create policy "Auth full access project_labels"
  on public.project_labels for all to authenticated using (true) with check (true);

create policy "Auth full access sprints"
  on public.sprints for all to authenticated using (true) with check (true);

create policy "Auth full access milestones"
  on public.milestones for all to authenticated using (true) with check (true);

create policy "Auth full access tasks"
  on public.tasks for all to authenticated using (true) with check (true);

create policy "Auth full access task_assignees"
  on public.task_assignees for all to authenticated using (true) with check (true);

create policy "Auth full access task_labels"
  on public.task_labels for all to authenticated using (true) with check (true);

create policy "Auth full access task_comments"
  on public.task_comments for all to authenticated using (true) with check (true);

create policy "Auth full access project_activity"
  on public.project_activity for all to authenticated using (true) with check (true);


-- ══════════════════════════════════════════════════════════════════════════════
-- updated_at triggers
-- ══════════════════════════════════════════════════════════════════════════════

-- Herbruikbare functie (aangemaakt in migratie 001, hier als fallback)
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_updated_at   on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.update_updated_at();

drop trigger if exists milestones_updated_at on public.milestones;
create trigger milestones_updated_at
  before update on public.milestones
  for each row execute function public.update_updated_at();

drop trigger if exists tasks_updated_at      on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.update_updated_at();

drop trigger if exists task_comments_updated_at on public.task_comments;
create trigger task_comments_updated_at
  before update on public.task_comments
  for each row execute function public.update_updated_at();


-- ══════════════════════════════════════════════════════════════════════════════
-- Realtime
-- Abonneer de tabellen op die de UI live moet bijwerken.
-- ══════════════════════════════════════════════════════════════════════════════

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_comments;
alter publication supabase_realtime add table public.project_activity;
