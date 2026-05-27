-- ─── Project number sequence ──────────────────────────────────────────────────

create sequence if not exists public.project_number_seq start 1;

alter table public.projects
  add column if not exists project_number int not null default nextval('public.project_number_seq');

create unique index if not exists projects_project_number_idx on public.projects(project_number);

-- ─── Migrate project statuses to new values ───────────────────────────────────

alter table public.projects drop constraint if exists projects_status_check;

update public.projects set status = case
  when status = 'actief'     then 'bezig'
  when status = 'gepauzeerd' then 'gepland'
  when status = 'voltooid'   then 'klaar'
  else status
end;

alter table public.projects
  add constraint projects_status_check
  check (status in ('gepland', 'bezig', 'feedback', 'klaar', 'gearchiveerd'));
