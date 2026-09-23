-- Run this once in Supabase Dashboard -> SQL Editor.
-- The policies below are suitable for this front-end demo. Tighten them when auth is added.

create table if not exists public.cslid_users (
  id text primary key,
  name text not null,
  email text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.cslid_profiles (
  id text primary key,
  user_id text not null,
  name text,
  startup text,
  updated_at timestamptz not null default now()
);

create table if not exists public.cslid_startups (
  id text primary key,
  user_id text,
  name text not null,
  tagline text,
  stage text,
  sector text,
  problem text,
  location text,
  seeking text,
  traction text,
  contact_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.cslid_posts (
  id text primary key,
  user_id text,
  author text,
  role text,
  post_time text,
  content text not null,
  image text,
  likes integer not null default 0,
  comments integer not null default 0,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cslid_connections (
  id text primary key,
  user_id text,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cslid_matches (
  id text primary key,
  user_id text,
  name text not null,
  contact_url text,
  matched_at timestamptz not null default now()
);

create table if not exists public.cslid_messages (
  id text primary key,
  user_id text,
  thread_key text not null,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.cslid_tasks (
  id text primary key,
  user_id text,
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

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'cslid_users', 'cslid_profiles', 'cslid_startups', 'cslid_posts',
    'cslid_connections', 'cslid_matches', 'cslid_messages', 'cslid_tasks'
  ] loop
    execute format('drop policy if exists "cslid demo access" on public.%I', table_name);
    execute format('create policy "cslid demo access" on public.%I for all to anon, authenticated using (true) with check (true)', table_name);
  end loop;
end $$;
