-- ─── Make project-docs bucket private ────────────────────────────────────────
-- Project attachments are client deliverables; public read exposed them to
-- anyone with the URL. The app now serves short-lived signed URLs instead.

update storage.buckets set public = false where id = 'project-docs';

drop policy if exists "Project docs are publicly readable" on storage.objects;

create policy "Authenticated users can read project docs"
  on storage.objects for select
  using (bucket_id = 'project-docs' and auth.role() = 'authenticated');
