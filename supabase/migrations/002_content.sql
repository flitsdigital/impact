-- ─── Posts ───────────────────────────────────────────────────────────────────

create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  klant_id      uuid references public.klanten(id) on delete set null,
  status        text not null default 'te_doen'
                  check (status in ('te_doen', 'bezig', 'klaar_voor_feedback', 'akkoord', 'gepost')),
  type          text not null default 'foto'
                  check (type in ('foto', 'video', 'reel', 'carousel')),
  caption       text,
  media_url     text,
  scheduled_at  date,
  published_at  timestamptz,
  assignee_id   uuid references auth.users(id) on delete set null,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

-- ─── Post logs (audit trail) ─────────────────────────────────────────────────

create table public.post_logs (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  action       text not null,   -- 'created' | 'status_changed' | 'updated' | 'media_uploaded'
  from_status  text,
  to_status    text,
  note         text,
  created_at   timestamptz default now() not null
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.posts     enable row level security;
alter table public.post_logs enable row level security;

create policy "Authenticated users full access on posts"
  on public.posts for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can read post_logs"
  on public.post_logs for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert post_logs"
  on public.post_logs for insert
  with check (auth.role() = 'authenticated');

-- ─── updated_at trigger ───────────────────────────────────────────────────────

create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.update_updated_at();

-- ─── Storage bucket for post media ───────────────────────────────────────────

insert into storage.buckets (id, name, public)
  values ('post-media', 'post-media', true)
  on conflict (id) do nothing;

create policy "Authenticated users can upload post media"
  on storage.objects for insert
  with check (bucket_id = 'post-media' and auth.role() = 'authenticated');

create policy "Post media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "Authenticated users can update post media"
  on storage.objects for update
  using (bucket_id = 'post-media' and auth.role() = 'authenticated');

create policy "Authenticated users can delete post media"
  on storage.objects for delete
  using (bucket_id = 'post-media' and auth.role() = 'authenticated');
