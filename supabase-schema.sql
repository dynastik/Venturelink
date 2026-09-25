-- cslid database schema
-- Run this in Supabase Dashboard -> SQL Editor after reviewing it.
-- This schema expects Supabase Auth users. Never use a service-role key in the website.

create extension if not exists pgcrypto;

-- Safe reset for the app data while keeping Auth users intact.
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
  email text not null unique,
  role text not null check (role in ('founder', 'investor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cslid_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('founder', 'investor')),
  name text,
  startup text,
  headline text,
  bio text,
  location text,
  company text,
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.cslid_startups (
  id uuid primary key default gen_random_uuid(),
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
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.cslid_posts (
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('requested', 'accepted', 'rejected', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id),
  unique (requester_id, recipient_id)
);

create table if not exists public.cslid_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  matched_user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null unique references public.cslid_connections(id) on delete cascade,
  matched_at timestamptz not null default now(),
  check (user_id <> matched_user_id)
);

create table if not exists public.cslid_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  thread_key text not null,
  content text not null check (char_length(content) between 1 and 5000),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create table if not exists public.cslid_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_key text not null,
  complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cslid_users_email_idx on public.cslid_users (email);
create index if not exists cslid_connections_status_idx on public.cslid_connections (status);
create index if not exists cslid_connections_users_idx on public.cslid_connections (requester_id, recipient_id);
create index if not exists cslid_messages_thread_idx on public.cslid_messages (thread_key, created_at desc);
create index if not exists cslid_startups_public_idx on public.cslid_startups (is_public, user_id);

-- Enable live updates for the inbox and connection lifecycle.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cslid_messages'
  ) then
    alter publication supabase_realtime add table public.cslid_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cslid_connections'
  ) then
    alter publication supabase_realtime add table public.cslid_connections;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cslid_matches'
  ) then
    alter publication supabase_realtime add table public.cslid_matches;
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cslid_users_set_updated_at
before update on public.cslid_users
for each row execute function public.set_updated_at();

create trigger cslid_profiles_set_updated_at
before update on public.cslid_profiles
for each row execute function public.set_updated_at();

create trigger cslid_startups_set_updated_at
before update on public.cslid_startups
for each row execute function public.set_updated_at();

create trigger cslid_connections_set_updated_at
before update on public.cslid_connections
for each row execute function public.set_updated_at();

create trigger cslid_tasks_set_updated_at
before update on public.cslid_tasks
for each row execute function public.set_updated_at();

alter table public.cslid_users enable row level security;
alter table public.cslid_profiles enable row level security;
alter table public.cslid_startups enable row level security;
alter table public.cslid_posts enable row level security;
alter table public.cslid_connections enable row level security;
alter table public.cslid_matches enable row level security;
alter table public.cslid_messages enable row level security;
alter table public.cslid_tasks enable row level security;

create policy "Users can read own account" on public.cslid_users
  for select to authenticated using (id = auth.uid());
create policy "Users can create own account" on public.cslid_users
  for insert to authenticated with check (id = auth.uid());
create policy "Users can update own account" on public.cslid_users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Users manage own profile" on public.cslid_profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Public profiles can be discovered" on public.cslid_profiles
  for select to anon, authenticated using (is_public = true);

create policy "Public profiles and startup discovery" on public.cslid_startups
  for select to anon, authenticated using (is_public = true or user_id = auth.uid());
create policy "Users manage own startups" on public.cslid_startups
  for insert to authenticated with check (user_id = auth.uid());
create policy "Users update own startups" on public.cslid_startups
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own startups" on public.cslid_startups
  for delete to authenticated using (user_id = auth.uid());

create policy "Anyone can view posts" on public.cslid_posts
  for select to anon, authenticated using (true);
create policy "Users create own posts" on public.cslid_posts
  for insert to authenticated with check (user_id = auth.uid());
create policy "Users update own posts" on public.cslid_posts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own posts" on public.cslid_posts
  for delete to authenticated using (user_id = auth.uid());

create policy "Users can view their own connection rows" on public.cslid_connections
  for select to authenticated using (requester_id = auth.uid() or recipient_id = auth.uid());
create policy "Users can create connection requests" on public.cslid_connections
  for insert to authenticated with check (requester_id = auth.uid() and recipient_id <> auth.uid());
create policy "Users can update connection rows" on public.cslid_connections
  for update to authenticated using (requester_id = auth.uid() or recipient_id = auth.uid())
  with check ((requester_id = auth.uid() or recipient_id = auth.uid()) and requester_id <> recipient_id);
create policy "Users can delete own connection rows" on public.cslid_connections
  for delete to authenticated using (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "Users can view their match rows" on public.cslid_matches
  for select to authenticated using (user_id = auth.uid() or matched_user_id = auth.uid());
create policy "Users can create own match rows" on public.cslid_matches
  for insert to authenticated with check (user_id = auth.uid() and matched_user_id <> auth.uid());
create policy "Users can update own match rows" on public.cslid_matches
  for update to authenticated using (user_id = auth.uid() or matched_user_id = auth.uid())
  with check ((user_id = auth.uid() or matched_user_id = auth.uid()) and user_id <> matched_user_id);

-- Accepting a request must update the connection and create the match together.
-- The function inserts one match row visible to both participants through RLS.
create or replace function public.accept_connection(p_connection_id uuid)
returns public.cslid_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  connection_row public.cslid_connections;
begin
  select * into connection_row
  from public.cslid_connections
  where id = p_connection_id
    and recipient_id = auth.uid()
    and status = 'requested'
  for update;

  if connection_row.id is null then
    raise exception 'Connection request not found or not actionable';
  end if;

  update public.cslid_connections
  set status = 'accepted'
  where id = connection_row.id
  returning * into connection_row;

  insert into public.cslid_matches (user_id, matched_user_id, connection_id)
  values (connection_row.requester_id, connection_row.recipient_id, connection_row.id)
  on conflict (connection_id) do nothing;

  return connection_row;
end;
$$;

create or replace function public.reject_connection(p_connection_id uuid)
returns public.cslid_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  connection_row public.cslid_connections;
begin
  update public.cslid_connections
  set status = 'rejected'
  where id = p_connection_id
    and recipient_id = auth.uid()
    and status = 'requested'
  returning * into connection_row;

  if connection_row.id is null then
    raise exception 'Connection request not found or not actionable';
  end if;
  return connection_row;
end;
$$;

revoke all on function public.accept_connection(uuid) from public;
grant execute on function public.accept_connection(uuid) to authenticated;
revoke all on function public.reject_connection(uuid) from public;
grant execute on function public.reject_connection(uuid) to authenticated;

create policy "Users can view their message threads" on public.cslid_messages
  for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "Users can send messages" on public.cslid_messages
  for insert to authenticated with check (sender_id = auth.uid() and recipient_id <> auth.uid());
create policy "Users can update own sent messages" on public.cslid_messages
  for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid() and recipient_id <> auth.uid());
create policy "Users can delete own sent messages" on public.cslid_messages
  for delete to authenticated using (sender_id = auth.uid());

create policy "Users manage own tasks" on public.cslid_tasks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
