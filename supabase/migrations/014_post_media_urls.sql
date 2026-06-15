-- ─── Posts: meerdere afbeeldingen per post ───────────────────────────────────
-- Vervangt de enkele media_url door een geordende array. Volgorde van de array
-- ís de volgorde van de afbeeldingen (geen aparte sequence-kolom nodig).

alter table public.posts
  add column media_urls text[] not null default '{}';

update public.posts
  set media_urls = array[media_url]
  where media_url is not null;

alter table public.posts
  drop column media_url;
