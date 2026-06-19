-- ─── Volgorde van posts binnen een dag ─────────────────────────────────────────
-- De content-kalender ordent posts op `scheduled_at` (date-only). Binnen één dag
-- was er geen vaste volgorde — die kwam uit de query. Met `position` kan een post
-- via drag&drop op een exacte plek tussen andere posts van die dag staan.
--
-- Sortering: order by scheduled_at, position nulls last, created_at.
-- Bestaande rijen blijven null (sorteren achteraan op created_at); zodra een dag
-- voor het eerst herordend wordt, krijgen díe posts integer-posities (0,1,2,…).

alter table public.posts
  add column if not exists position double precision;
