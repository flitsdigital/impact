-- Allow anonymous (unauthenticated) read access for public preview links
-- These policies only allow SELECT; all writes still require authentication.

-- Posts
create policy "Anon can read posts for preview"
  on public.posts for select
  to anon
  using (true);

-- Klanten names (shown on preview pages)
create policy "Anon can read klanten for preview"
  on public.klanten for select
  to anon
  using (true);

-- Profiles (assignee avatars on preview pages)
create policy "Anon can read profiles for preview"
  on public.profiles for select
  to anon
  using (true);

-- Post assignees join table
create policy "Anon can read post_assignees for preview"
  on public.post_assignees for select
  to anon
  using (true);
