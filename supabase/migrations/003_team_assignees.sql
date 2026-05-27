-- ─── Profiles (mirrors auth.users for public access) ─────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  email       text,
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Authenticated users can read all profiles"
  on public.profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- Auto-sync on sign-up / profile update
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  on conflict (id) do update set
    full_name  = excluded.full_name,
    avatar_url = excluded.avatar_url,
    email      = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing users
insert into public.profiles (id, full_name, avatar_url, email)
select
  id,
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'avatar_url',
  email
from auth.users
on conflict (id) do update set
  full_name  = excluded.full_name,
  avatar_url = excluded.avatar_url,
  email      = excluded.email,
  updated_at = now();

-- ─── Post assignees (multiple team members per post) ──────────────────────────

create table if not exists public.post_assignees (
  post_id    uuid not null references public.posts(id)    on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

alter table public.post_assignees enable row level security;

create policy "Authenticated users full access on post_assignees"
  on public.post_assignees for all to authenticated
  using (true) with check (true);
