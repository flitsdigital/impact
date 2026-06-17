-- ─── Persoonlijke todo's ──────────────────────────────────────────────────────
-- Vereist migraties 003 (profiles). Eigen lijst per gebruiker; een toegewezen
-- teamlid ziet de todo ook. RLS owner+assignee (strenger dan de app-conventie).
--
-- NB: Er bestond al een prototype-tabel `todos` (0 rijen, ander schema).
--     Die wordt hier vervangen door het definitieve schema.

drop table if exists public.todos cascade;

create table public.todos (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  titel       text        not null,
  notitie     text,
  done        boolean     not null default false,
  deadline    date,
  prioriteit  text        not null default 'normaal'
                          check (prioriteit in ('urgent','hoog','normaal','laag')),
  volgorde    int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.todo_assignees (
  todo_id     uuid not null references public.todos(id)    on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (todo_id, profile_id)
);

create index if not exists todos_user_idx          on public.todos(user_id);
create index if not exists todo_assignees_prof_idx on public.todo_assignees(profile_id);

alter table public.todos          enable row level security;
alter table public.todo_assignees enable row level security;

create policy "todos select" on public.todos for select to authenticated
  using ( user_id = auth.uid()
          or exists (select 1 from public.todo_assignees a
                     where a.todo_id = todos.id and a.profile_id = auth.uid()) );

create policy "todos insert" on public.todos for insert to authenticated
  with check ( user_id = auth.uid() );

create policy "todos update" on public.todos for update to authenticated
  using ( user_id = auth.uid()
          or exists (select 1 from public.todo_assignees a
                     where a.todo_id = todos.id and a.profile_id = auth.uid()) )
  with check ( user_id = auth.uid()
               or exists (select 1 from public.todo_assignees a
                          where a.todo_id = todos.id and a.profile_id = auth.uid()) );

create policy "todos delete" on public.todos for delete to authenticated
  using ( user_id = auth.uid() );

create policy "todo_assignees readable" on public.todo_assignees for select to authenticated
  using ( exists (select 1 from public.todos t
                  where t.id = todo_assignees.todo_id
                        and (t.user_id = auth.uid() or todo_assignees.profile_id = auth.uid())) );

create policy "todo_assignees writable by owner" on public.todo_assignees
  for insert to authenticated
  with check ( exists (select 1 from public.todos t
                       where t.id = todo_assignees.todo_id and t.user_id = auth.uid()) );

create policy "todo_assignees deletable by owner" on public.todo_assignees
  for delete to authenticated
  using ( exists (select 1 from public.todos t
                  where t.id = todo_assignees.todo_id and t.user_id = auth.uid()) );

drop trigger if exists todos_updated_at on public.todos;
create trigger todos_updated_at
  before update on public.todos
  for each row execute function public.update_updated_at();
