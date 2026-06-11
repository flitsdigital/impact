-- ─── Drop anon preview policies ───────────────────────────────────────────────
-- The /preview/[id] page now fetches server-side with the service-role key,
-- so anonymous REST access to these tables is no longer needed (it exposed
-- the full klanten/profiles/posts tables to anyone with the anon key).

drop policy if exists "Anon can read posts for preview"          on public.posts;
drop policy if exists "Anon can read klanten for preview"        on public.klanten;
drop policy if exists "Anon can read profiles for preview"       on public.profiles;
drop policy if exists "Anon can read post_assignees for preview" on public.post_assignees;
