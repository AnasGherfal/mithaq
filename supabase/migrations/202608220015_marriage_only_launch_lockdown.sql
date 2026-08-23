update public.member_connection_spaces
set membership_state = 'paused'::public.connection_space_membership_state,
    is_current = false,
    updated_at = clock_timestamp()
where space = 'friendship'::public.connection_space;

insert into public.member_connection_spaces (
  user_id, space, membership_state, is_current, joined_at, updated_at
)
select
  u.id,
  'marriage'::public.connection_space,
  'active'::public.connection_space_membership_state,
  true,
  clock_timestamp(),
  clock_timestamp()
from public.users u
where u.account_status = 'active'::public.account_status
on conflict (user_id, space) do update
set membership_state = 'active'::public.connection_space_membership_state,
    is_current = true,
    updated_at = clock_timestamp();

drop policy if exists "connection spaces read own" on public.member_connection_spaces;
create policy "connection spaces read own marriage"
on public.member_connection_spaces
for select
to authenticated
using (
  user_id = (select auth.uid())
  and space = 'marriage'::public.connection_space
);

drop policy if exists "friendship profiles read own" on public.friendship_profiles;
revoke all on table public.friendship_profiles from authenticated;

create or replace function public.list_my_connection_spaces()
returns table (
  space public.connection_space,
  membership_state public.connection_space_membership_state,
  is_current boolean,
  profile_completed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'::public.account_status
  ) then
    raise exception 'account unavailable';
  end if;

  return query
  select
    'marriage'::public.connection_space,
    membership.membership_state,
    coalesce(membership.is_current, false),
    exists (
      select 1
      from public.member_profiles p
      where p.user_id = v_user_id
        and p.profile_completed_at is not null
    )
  from (select 1) seed
  left join public.member_connection_spaces membership
    on membership.user_id = v_user_id
   and membership.space = 'marriage'::public.connection_space;
end;
$$;

create or replace function public.join_my_connection_space(p_space public.connection_space)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_space is distinct from 'marriage'::public.connection_space then
    raise exception 'connection space unavailable';
  end if;

  if not exists (
    select 1 from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'::public.account_status
  ) then
    raise exception 'account unavailable';
  end if;

  update public.member_connection_spaces
  set is_current = false,
      updated_at = clock_timestamp()
  where user_id = v_user_id
    and is_current;

  insert into public.member_connection_spaces (
    user_id, space, membership_state, is_current, joined_at, updated_at
  ) values (
    v_user_id,
    'marriage'::public.connection_space,
    'active'::public.connection_space_membership_state,
    true,
    clock_timestamp(),
    clock_timestamp()
  )
  on conflict (user_id, space) do update
  set membership_state = 'active'::public.connection_space_membership_state,
      is_current = true,
      updated_at = clock_timestamp();

  return true;
end;
$$;

create or replace function public.set_my_current_connection_space(p_space public.connection_space)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_space is distinct from 'marriage'::public.connection_space then
    raise exception 'connection space unavailable';
  end if;

  if not exists (
    select 1 from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'::public.account_status
  ) then
    raise exception 'account unavailable';
  end if;

  if not exists (
    select 1
    from public.member_connection_spaces s
    where s.user_id = v_user_id
      and s.space = 'marriage'::public.connection_space
      and s.membership_state = 'active'::public.connection_space_membership_state
  ) then
    perform public.join_my_connection_space('marriage'::public.connection_space);
    return true;
  end if;

  update public.member_connection_spaces
  set is_current = (space = 'marriage'::public.connection_space),
      updated_at = clock_timestamp()
  where user_id = v_user_id;

  return true;
end;
$$;

revoke execute on function public.get_my_friendship_profile() from authenticated;
revoke execute on function public.list_friendship_discovery(integer) from authenticated;
revoke execute on function public.list_my_friendship_chats() from authenticated;
revoke execute on function public.list_my_friendship_connections() from authenticated;
revoke execute on function public.list_my_friendship_messages(uuid, timestamptz, uuid, integer) from authenticated;
revoke execute on function public.list_my_friendship_requests() from authenticated;
revoke execute on function public.mark_my_friendship_conversation_read(uuid, timestamptz) from authenticated;
revoke execute on function public.open_my_friendship_conversation(uuid) from authenticated;
revoke execute on function public.respond_to_friendship_request(uuid, boolean) from authenticated;
revoke execute on function public.save_my_friendship_profile(text, text, text, text[]) from authenticated;
revoke execute on function public.send_friendship_message(uuid, text, text) from authenticated;
revoke execute on function public.send_friendship_request(uuid) from authenticated;
revoke execute on function public.withdraw_friendship_request(uuid) from authenticated;
