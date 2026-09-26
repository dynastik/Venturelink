-- Non-destructive repair for message sends and server-enforced action limits.
-- Run this in Supabase SQL Editor; it does not drop tables or application data.

create or replace function public.is_blocked_between(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cslid_blocks
    where (blocker_id = first_user and blocked_id = second_user)
       or (blocker_id = second_user and blocked_id = first_user)
  );
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

  if public.is_blocked_between(new.requester_id, new.recipient_id) then
    raise exception 'This user is blocked';
  end if;

  select count(*) into recent_count
  from public.cslid_connections
  where requester_id = new.requester_id
    and status = 'requested'
    and created_at > now() - interval '24 hours';
  if recent_count >= 20 then
    raise exception 'Daily connection request limit reached';
  end if;
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
