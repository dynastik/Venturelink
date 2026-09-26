-- Non-destructive message-send migration.
-- Run in Supabase SQL Editor; this does not drop tables or application data.

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

revoke all on function public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

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
  values (
    sender,
    p_recipient_id,
    least(sender::text, p_recipient_id::text) || ':' || greatest(sender::text, p_recipient_id::text),
    trim(p_content)
  )
  returning * into message_row;
  return message_row;
end;
$$;

revoke all on function public.send_connection_message(uuid, text) from public;
grant execute on function public.send_connection_message(uuid, text) to authenticated;

notify pgrst, 'reload schema';
