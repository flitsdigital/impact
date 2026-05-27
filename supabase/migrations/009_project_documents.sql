-- ─── Project documents / attachments ─────────────────────────────────────────

create table public.project_documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  type        text not null check (type in ('link', 'file')),
  naam        text not null,
  url         text not null,
  created_at  timestamptz default now() not null
);

alter table public.project_documents enable row level security;

create policy "Authenticated users full access on project_documents"
  on public.project_documents for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ─── Storage bucket for project files ────────────────────────────────────────

insert into storage.buckets (id, name, public)
  values ('project-docs', 'project-docs', true)
  on conflict (id) do nothing;

create policy "Authenticated users can upload project docs"
  on storage.objects for insert
  with check (bucket_id = 'project-docs' and auth.role() = 'authenticated');

create policy "Project docs are publicly readable"
  on storage.objects for select
  using (bucket_id = 'project-docs');

create policy "Authenticated users can update project docs"
  on storage.objects for update
  using (bucket_id = 'project-docs' and auth.role() = 'authenticated');

create policy "Authenticated users can delete project docs"
  on storage.objects for delete
  using (bucket_id = 'project-docs' and auth.role() = 'authenticated');
