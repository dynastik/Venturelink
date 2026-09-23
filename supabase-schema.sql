-- cslid database schema
-- Run this in Supabase Dashboard -> SQL Editor after reviewing it.
-- This schema expects Supabase Auth users. Never use a service-role key in the website.

-- These prototype tables are safe to recreate while the project is empty.
-- This removes only cslid application tables; it does not remove Auth users.
drop table if exists public.cslid_messages cascade;
drop table if exists public.cslid_tasks cascade;
drop table if exists public.cslid_matches cascade;
drop table if exists public.cslid_connections cascade;
drop table if exists public.cslid_posts cascade;
drop table if exists public.cslid_startups cascade;
drop table if exists public.cslid_profiles cascade;
drop table if exists public.cslid_users cascade;

create table if not exists public.cslid_users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.cslid_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text,
  startup text,
  updated_at timestamptz not null default now()
);

create table if not exists public.cslid_startups (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  tagline text not null check (char_length(tagline) between 1 and 300),
  stage text,
  sector text,
  problem text,
  location text,
  seeking text,
  traction text,
  contact_url text check (contact_url is null or contact_url like 'https://%'),
  updated_at timestamptz not null default now()
);

create table if not exists public.cslid_posts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  author text,
  role text,
  post_time text,
  content text not null check (char_length(content) between 1 and 5000),
  image text,
  likes integer not null default 0 check (likes >= 0),
  comments integer not null default 0 check (comments >= 0),
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cslid_connections (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cslid_matches (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  contact_url text check (contact_url is null or contact_url like 'https://%'),
  matched_at timestamptz not null default now()
);

create table if not exists public.cslid_messages (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_key text not null,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.cslid_tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_key text not null,
  complete boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.cslid_users enable row level security;
alter table public.cslid_profiles enable row level security;
alter table public.cslid_startups enable row level security;
alter table public.cslid_posts enable row level security;
alter table public.cslid_connections enable row level security;
alter table public.cslid_matches enable row level security;
alter table public.cslid_messages enable row level security;
alter table public.cslid_tasks enable row level security;

drop policy if exists "Users can read own account" on public.cslid_users;
drop policy if exists "Users can create own account" on public.cslid_users;
drop policy if exists "Users can update own account" on public.cslid_users;
create policy "Users can read own account" on public.cslid_users
  for select to authenticated using (id = auth.uid());
create policy "Users can create own account" on public.cslid_users
  for insert to authenticated with check (id = auth.uid());
create policy "Users can update own account" on public.cslid_users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Users manage own profile" on public.cslid_profiles;
create policy "Users manage own profile" on public.cslid_profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Anyone can view startups" on public.cslid_startups;
drop policy if exists "Users manage own startups" on public.cslid_startups;
create policy "Anyone can view startups" on public.cslid_startups
  for select to anon, authenticated using (true);
create policy "Users manage own startups" on public.cslid_startups
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Anyone can view posts" on public.cslid_posts;
drop policy if exists "Users create own posts" on public.cslid_posts;
drop policy if exists "Users update own posts" on public.cslid_posts;
drop policy if exists "Users delete own posts" on public.cslid_posts;
create policy "Anyone can view posts" on public.cslid_posts
  for select to anon, authenticated using (true);
create policy "Users create own posts" on public.cslid_posts
  for insert to authenticated with check (user_id = auth.uid());
create policy "Users update own posts" on public.cslid_posts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own posts" on public.cslid_posts
  for delete to authenticated using (user_id = auth.uid());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'cslid_connections', 'cslid_matches', 'cslid_messages', 'cslid_tasks'
  ] loop
    execute format('drop policy if exists "Users manage own rows" on public.%I', table_name);
    execute format(
      'create policy "Users manage own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      table_name
    );
  end loop;
end $$;
