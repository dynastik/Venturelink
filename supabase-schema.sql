-- DESTRUCTIVE FULL RESET:
-- Running this script deletes every Supabase Auth user and all cslid app data,
-- then recreates the app tables, policies, triggers, and RPC functions below.
-- Export anything you need before running. Never use a service-role key in the website.

create extension if not exists pgcrypto;

-- Remove cslid data first, then clear Auth users so no stale test accounts remain.
drop table if exists public.cslid_messages cascade;
drop table if exists public.cslid_tasks cascade;
drop table if exists public.cslid_matches cascade;
drop table if exists public.cslid_connections cascade;
drop table if exists public.cslid_connection_request_attempts cascade;
drop table if exists public.cslid_posts cascade;
drop table if exists public.cslid_startups cascade;
drop table if exists public.cslid_profiles cascade;
drop table if exists public.cslid_users cascade;
drop table if exists public.cslid_reports cascade;
drop table if exists public.cslid_blocks cascade;
delete from auth.users;

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

create table if not exists public.cslid_connection_request_attempts (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
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

create table if not exists public.cslid_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.cslid_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 1000),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create index if not exists cslid_users_email_idx on public.cslid_users (email);
create index if not exists cslid_connections_status_idx on public.cslid_connections (status);
create index if not exists cslid_connections_users_idx on public.cslid_connections (requester_id, recipient_id);
create index if not exists cslid_connection_attempts_user_time_idx
  on public.cslid_connection_request_attempts (requester_id, created_at desc);
create unique index if not exists cslid_connections_pair_idx
  on public.cslid_connections (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index if not exists cslid_messages_thread_idx on public.cslid_messages (thread_key, created_at desc);
create index if not exists cslid_startups_public_idx on public.cslid_startups (is_public, user_id);
create index if not exists cslid_blocks_blocked_idx on public.cslid_blocks (blocked_id);
create index if not exists cslid_reports_reported_idx on public.cslid_reports (reported_id, created_at desc);

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
alter table public.cslid_connection_request_attempts enable row level security;
alter table public.cslid_matches enable row level security;
alter table public.cslid_messages enable row level security;
alter table public.cslid_tasks enable row level security;
alter table public.cslid_blocks enable row level security;
alter table public.cslid_reports enable row level security;

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
  for insert to authenticated with check (
    requester_id = auth.uid()
    and recipient_id <> auth.uid()
    and status = 'requested'
  );
create policy "Users can delete own connection rows" on public.cslid_connections
  for delete to authenticated using (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "Users can view their match rows" on public.cslid_matches
  for select to authenticated using (user_id = auth.uid() or matched_user_id = auth.uid());

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

create or replace function public.retry_connection_request(p_connection_id uuid)
returns public.cslid_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  connection_row public.cslid_connections;
begin
  update public.cslid_connections
  set status = 'requested'
  where id = p_connection_id
    and requester_id = auth.uid()
    and status = 'rejected'
  returning * into connection_row;

  if connection_row.id is null then
    raise exception 'Rejected connection request not found or not retryable';
  end if;
  return connection_row;
end;
$$;

revoke all on function public.accept_connection(uuid) from public;
grant execute on function public.accept_connection(uuid) to authenticated;
revoke all on function public.reject_connection(uuid) from public;
grant execute on function public.reject_connection(uuid) to authenticated;
revoke all on function public.retry_connection_request(uuid) from public;
grant execute on function public.retry_connection_request(uuid) to authenticated;

create policy "Users can view their message threads" on public.cslid_messages
  for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "Users can send messages" on public.cslid_messages
  for insert to authenticated with check (sender_id = auth.uid() and recipient_id <> auth.uid());
create policy "Users can delete own sent messages" on public.cslid_messages
  for delete to authenticated using (sender_id = auth.uid());

create policy "Users manage own tasks" on public.cslid_tasks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can view their own blocks" on public.cslid_blocks
  for select to authenticated using (blocker_id = auth.uid());

create policy "Users can create reports" on public.cslid_reports
  for insert to authenticated with check (reporter_id = auth.uid() and reported_id <> auth.uid());
create policy "Users can view their own reports" on public.cslid_reports
  for select to authenticated using (reporter_id = auth.uid());

create or replace function public.is_blocked_between(first_user uuid, second_user uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or (caller <> first_user and caller <> second_user) then
    return false;
  end if;

  return exists (
    select 1 from public.cslid_blocks
    where (blocker_id = first_user and blocked_id = second_user)
       or (blocker_id = second_user and blocked_id = first_user)
  );
end;
$$;

create or replace function public.enforce_connection_request_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  if tg_op = 'UPDATE' then
    if old.status = 'requested' or new.status <> 'requested' then
      return new;
    end if;
  elsif new.status <> 'requested' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('connection:' || new.requester_id::text, 0));
  if public.is_blocked_between(new.requester_id, new.recipient_id) then
    raise exception 'This user is blocked';
  end if;
  select count(*) into recent_count
  from public.cslid_connection_request_attempts
  where requester_id = new.requester_id
    and created_at > now() - interval '24 hours';
  if recent_count >= 20 then
    raise exception 'Daily connection request limit reached';
  end if;
  insert into public.cslid_connection_request_attempts (requester_id, recipient_id)
  values (new.requester_id, new.recipient_id);
  return new;
end;
$$;

create or replace function public.enforce_message_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('message:' || new.sender_id::text, 0));
  if public.is_blocked_between(new.sender_id, new.recipient_id) then
    raise exception 'This user is blocked';
  end if;
  select count(*) into recent_count
  from public.cslid_messages
  where sender_id = new.sender_id
    and created_at > now() - interval '1 hour';
  if recent_count >= 100 then
    raise exception 'Hourly message limit reached';
  end if;
  return new;
end;
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
revoke all on function public.enforce_connection_request_limit() from public;
revoke all on function public.enforce_message_limit() from public;

drop trigger if exists cslid_connection_action_limit on public.cslid_connections;
create trigger cslid_connection_action_limit
before insert or update on public.cslid_connections
for each row execute function public.enforce_connection_request_limit();

drop trigger if exists cslid_message_action_limit on public.cslid_messages;
create trigger cslid_message_action_limit
before insert on public.cslid_messages
for each row execute function public.enforce_message_limit();

create or replace function public.block_user(p_blocked_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_blocked_id is null or p_blocked_id = auth.uid() then
    raise exception 'Invalid user to block';
  end if;
  insert into public.cslid_blocks (blocker_id, blocked_id)
  values (auth.uid(), p_blocked_id)
  on conflict do nothing;
  delete from public.cslid_connections
  where (requester_id = auth.uid() and recipient_id = p_blocked_id)
     or (requester_id = p_blocked_id and recipient_id = auth.uid());
  delete from public.cslid_messages
  where (sender_id = auth.uid() and recipient_id = p_blocked_id)
     or (sender_id = p_blocked_id and recipient_id = auth.uid());
  return true;
end;
$$;

create or replace function public.report_user(p_reported_id uuid, p_reason text)
returns public.cslid_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row public.cslid_reports;
begin
  if p_reported_id is null or p_reported_id = auth.uid()
     or char_length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Invalid report';
  end if;
  insert into public.cslid_reports (reporter_id, reported_id, reason)
  values (auth.uid(), p_reported_id, left(trim(p_reason), 1000))
  returning * into report_row;
  return report_row;
end;
$$;

create or replace function public.export_my_data()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'user', (select to_jsonb(u) from public.cslid_users u where u.id = auth.uid()),
    'profile', (select to_jsonb(p) from public.cslid_profiles p where p.user_id = auth.uid()),
    'startups', coalesce((select jsonb_agg(to_jsonb(s)) from public.cslid_startups s where s.user_id = auth.uid()), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(to_jsonb(p)) from public.cslid_posts p where p.user_id = auth.uid()), '[]'::jsonb),
    'connections', coalesce((select jsonb_agg(to_jsonb(c)) from public.cslid_connections c where c.requester_id = auth.uid() or c.recipient_id = auth.uid()), '[]'::jsonb),
    'messages', coalesce((select jsonb_agg(to_jsonb(m)) from public.cslid_messages m where m.sender_id = auth.uid() or m.recipient_id = auth.uid()), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(to_jsonb(t)) from public.cslid_tasks t where t.user_id = auth.uid()), '[]'::jsonb),
    'blocks', coalesce((select jsonb_agg(to_jsonb(b)) from public.cslid_blocks b where b.blocker_id = auth.uid()), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(to_jsonb(r)) from public.cslid_reports r where r.reporter_id = auth.uid()), '[]'::jsonb)
  );
$$;

create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
  return true;
end;
$$;

revoke all on function public.block_user(uuid) from public;
grant execute on function public.block_user(uuid) to authenticated;
revoke all on function public.report_user(uuid, text) from public;
grant execute on function public.report_user(uuid, text) to authenticated;
revoke all on function public.export_my_data() from public;
grant execute on function public.export_my_data() to authenticated;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

drop policy if exists "Users can create connection requests" on public.cslid_connections;
create policy "Users can create connection requests" on public.cslid_connections
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and recipient_id <> auth.uid()
    and status = 'requested'
    and not public.is_blocked_between(requester_id, recipient_id)
  );

drop policy if exists "Users can send messages" on public.cslid_messages;
create policy "Users can send messages" on public.cslid_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and recipient_id <> auth.uid()
    and not public.is_blocked_between(sender_id, recipient_id)
    and exists (
      select 1 from public.cslid_connections c
      where ((c.requester_id = sender_id and c.recipient_id = recipient_id)
          or (c.requester_id = recipient_id and c.recipient_id = sender_id))
        and c.status = 'accepted'
    )
  );

create or replace function public.send_connection_message(p_recipient_id uuid, p_content text)
returns public.cslid_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  sender uuid := auth.uid();
  message_row public.cslid_messages;
begin
  if sender is null then
    raise exception 'Authentication required';
  end if;
  if p_recipient_id is null or p_recipient_id = sender then
    raise exception 'Invalid message recipient';
  end if;
  if char_length(trim(coalesce(p_content, ''))) = 0 or char_length(p_content) > 5000 then
    raise exception 'Message must contain between 1 and 5000 characters';
  end if;
  if public.is_blocked_between(sender, p_recipient_id) then
    raise exception 'This user is blocked';
  end if;
  if not exists (
    select 1 from public.cslid_connections c
    where ((c.requester_id = sender and c.recipient_id = p_recipient_id)
        or (c.requester_id = p_recipient_id and c.recipient_id = sender))
      and c.status = 'accepted'
  ) then
    raise exception 'An accepted connection is required to message this user';
  end if;

  insert into public.cslid_messages (sender_id, recipient_id, thread_key, content)
  values (sender, p_recipient_id, least(sender::text, p_recipient_id::text) || ':' || greatest(sender::text, p_recipient_id::text), trim(p_content))
  returning * into message_row;
  return message_row;
end;
$$;

revoke all on function public.send_connection_message(uuid, text) from public;
grant execute on function public.send_connection_message(uuid, text) to authenticated;

notify pgrst, 'reload schema';
