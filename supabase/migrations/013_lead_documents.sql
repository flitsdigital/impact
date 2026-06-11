-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 013: Lead documents / bijlagen
-- Vereisten: migration 012 (leads) moet al bestaan.
-- Idempotent: veilig opnieuw uitvoeren.
-- Zelfde opzet als project_documents (009), maar met een direct privé bucket
-- (signed URLs, zoals project-docs sinds migration 011).
-- ══════════════════════════════════════════════════════════════════════════════


-- ─── 1. Lead documents ────────────────────────────────────────────────────────

create table if not exists public.lead_documents (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  type        text not null check (type in ('link', 'file')),
  naam        text not null,
  url         text not null,
  created_at  timestamptz default now() not null
);

create index if not exists lead_documents_lead_idx
  on public.lead_documents (lead_id, created_at);

alter table public.lead_documents enable row level security;

drop policy if exists "Auth full access lead_documents" on public.lead_documents;
create policy "Auth full access lead_documents"
  on public.lead_documents for all to authenticated using (true) with check (true);


-- ─── 2. Privé storage bucket voor lead-bestanden ─────────────────────────────

insert into storage.buckets (id, name, public)
  values ('lead-docs', 'lead-docs', false)
  on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload lead docs" on storage.objects;
create policy "Authenticated users can upload lead docs"
  on storage.objects for insert
  with check (bucket_id = 'lead-docs' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can read lead docs" on storage.objects;
create policy "Authenticated users can read lead docs"
  on storage.objects for select
  using (bucket_id = 'lead-docs' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update lead docs" on storage.objects;
create policy "Authenticated users can update lead docs"
  on storage.objects for update
  using (bucket_id = 'lead-docs' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete lead docs" on storage.objects;
create policy "Authenticated users can delete lead docs"
  on storage.objects for delete
  using (bucket_id = 'lead-docs' and auth.role() = 'authenticated');
