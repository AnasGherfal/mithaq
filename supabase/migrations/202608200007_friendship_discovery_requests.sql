create type public.friendship_request_status as enum (
  'pending',
  'accepted',
  'declined',
  'withdrawn'
);

create table private.friendship_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.users(id) on delete cascade,
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  status public.friendship_request_status not null default 'pending',
  created_at timestamptz not null default clock_timestamp(),
  responded_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  check (requester_user_id <> recipient_user_id)
);

create unique index friendship_requests_one_active_pair_idx
  on private.friendship_requests (
    least(requester_user_id, recipient_user_id),
    greatest(requester_user_id, recipient_user_id)
  )
  where status in ('pending', 'accepted');

create index friendship_requests_recipient_status_idx
  on private.friendship_requests (recipient_user_id, status, created_at desc, id);

create index friendship_requests_requester_status_idx
  on private.friendship_requests (requester_user_id, status, created_at desc, id);

revoke all on table private.friendship_requests from public, anon, authenticated;
grant select, insert, update, delete on table private.friendship_requests to service_role;

create or replace function private.friendship_member_is_eligible(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.users u
    join public.member_connection_spaces s
      on s.user_id = u.id
     and s.space = 'friendship'::public.connection_space
     and s.membership_state = 'active'::public.connection_space_membership_state
    join public.friendship_profiles p on p.user_id = u.id
    where u.id = p_user_id
      and u.account_status = 'active'
      and p.profile_completed_at is not null
      and p.display_name is not null
      and p.about_me is not null
      and p.city is not null
      and cardinality(p.interests) >= 2
  );
$$;

create or replace function public.list_friendship_discovery(
  p_limit integer default 6
)
returns table (
  user_id uuid,
  display_name text,
  about_me text,
  city text,
  interests text[],
  shared_interests text[],
  shared_interest_count integer
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_my_interests text[];
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_limit < 1 or p_limit > 12 then
    raise exception 'invalid friendship discovery limit';
  end if;

  if not private.friendship_member_is_eligible(v_user_id) then
    raise exception 'friendship profile required';
  end if;

  select p.interests
  into v_my_interests
  from public.friendship_profiles p
  where p.user_id = v_user_id;

  return query
  with candidates as (
    select
      p.user_id,
      p.display_name,
      p.about_me,
      p.city,
      p.interests,
      coalesce(
        array(
          select mine.value
          from unnest(v_my_interests) mine(value)
          where exists (
            select 1
            from unnest(p.interests) theirs(value)
            where lower(theirs.value) = lower(mine.value)
          )
          order by mine.value
        ),
        '{}'::text[]
      ) as shared
    from public.friendship_profiles p
    where p.user_id <> v_user_id
      and private.friendship_member_is_eligible(p.user_id)
      and not private.members_are_blocked(v_user_id, p.user_id)
      and not exists (
        select 1
        from private.friendship_requests r
        where least(r.requester_user_id, r.recipient_user_id) = least(v_user_id, p.user_id)
          and greatest(r.requester_user_id, r.recipient_user_id) = greatest(v_user_id, p.user_id)
          and (
            r.status in ('pending', 'accepted')
            or r.created_at >= clock_timestamp() - interval '30 days'
          )
      )
  )
  select
    c.user_id,
    c.display_name,
    c.about_me,
    c.city,
    c.interests,
    c.shared,
    cardinality(c.shared)::integer
  from candidates c
  order by
    cardinality(c.shared) desc,
    case
      when lower(c.city) = lower((select me.city from public.friendship_profiles me where me.user_id = v_user_id))
        then 0
      else 1
    end,
    md5(c.user_id::text || current_date::text)
  limit p_limit;
end;
$$;

create or replace function public.send_friendship_request(
  p_recipient_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_recipient_user_id is null or p_recipient_user_id = v_user_id then
    raise exception 'friendship recipient unavailable';
  end if;

  if not private.friendship_member_is_eligible(v_user_id)
     or not private.friendship_member_is_eligible(p_recipient_user_id)
     or private.members_are_blocked(v_user_id, p_recipient_user_id) then
    raise exception 'friendship recipient unavailable';
  end if;

  if exists (
    select 1
    from private.friendship_requests r
    where least(r.requester_user_id, r.recipient_user_id) = least(v_user_id, p_recipient_user_id)
      and greatest(r.requester_user_id, r.recipient_user_id) = greatest(v_user_id, p_recipient_user_id)
      and (
        r.status in ('pending', 'accepted')
        or r.created_at >= clock_timestamp() - interval '30 days'
      )
  ) then
    raise exception 'friendship request unavailable';
  end if;

  insert into private.friendship_requests (
    requester_user_id,
    recipient_user_id,
    status
  ) values (
    v_user_id,
    p_recipient_user_id,
    'pending'::public.friendship_request_status
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.list_my_friendship_requests()
returns table (
  request_id uuid,
  direction text,
  status public.friendship_request_status,
  counterpart_user_id uuid,
  display_name text,
  city text,
  interests text[],
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.member_connection_spaces s
    where s.user_id = v_user_id
      and s.space = 'friendship'::public.connection_space
      and s.membership_state = 'active'::public.connection_space_membership_state
  ) then
    raise exception 'friendship space required';
  end if;

  return query
  select
    r.id,
    case when r.requester_user_id = v_user_id then 'outgoing' else 'incoming' end,
    r.status,
    case when r.requester_user_id = v_user_id then r.recipient_user_id else r.requester_user_id end,
    p.display_name,
    p.city,
    p.interests,
    r.created_at
  from private.friendship_requests r
  join public.friendship_profiles p
    on p.user_id = case
      when r.requester_user_id = v_user_id then r.recipient_user_id
      else r.requester_user_id
    end
  where r.requester_user_id = v_user_id or r.recipient_user_id = v_user_id
  order by r.created_at desc, r.id desc;
end;
$$;

create or replace function public.respond_to_friendship_request(
  p_request_id uuid,
  p_accept boolean
)
returns public.friendship_request_status
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_request private.friendship_requests%rowtype;
  v_new_status public.friendship_request_status;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_request_id is null or p_accept is null then
    raise exception 'friendship decision required';
  end if;

  select *
  into v_request
  from private.friendship_requests r
  where r.id = p_request_id
    and r.recipient_user_id = v_user_id
  for update;

  if not found or v_request.status <> 'pending'::public.friendship_request_status then
    raise exception 'friendship request unavailable';
  end if;

  if private.members_are_blocked(v_request.requester_user_id, v_request.recipient_user_id) then
    raise exception 'friendship request unavailable';
  end if;

  if p_accept and (
    not private.friendship_member_is_eligible(v_request.requester_user_id)
    or not private.friendship_member_is_eligible(v_request.recipient_user_id)
  ) then
    raise exception 'friendship request unavailable';
  end if;

  v_new_status := case
    when p_accept then 'accepted'::public.friendship_request_status
    else 'declined'::public.friendship_request_status
  end;

  update private.friendship_requests
  set status = v_new_status,
      responded_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = v_request.id;

  return v_new_status;
end;
$$;

create or replace function public.withdraw_friendship_request(
  p_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  update private.friendship_requests
  set status = 'withdrawn'::public.friendship_request_status,
      responded_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = p_request_id
    and requester_user_id = v_user_id
    and status = 'pending'::public.friendship_request_status;

  if not found then
    raise exception 'friendship request unavailable';
  end if;

  return true;
end;
$$;

revoke all on function private.friendship_member_is_eligible(uuid)
  from public, anon, authenticated;
grant execute on function private.friendship_member_is_eligible(uuid)
  to service_role;

revoke all on function public.list_friendship_discovery(integer) from public, anon;
revoke all on function public.send_friendship_request(uuid) from public, anon;
revoke all on function public.list_my_friendship_requests() from public, anon;
revoke all on function public.respond_to_friendship_request(uuid, boolean) from public, anon;
revoke all on function public.withdraw_friendship_request(uuid) from public, anon;

grant execute on function public.list_friendship_discovery(integer)
  to authenticated, service_role;
grant execute on function public.send_friendship_request(uuid)
  to authenticated, service_role;
grant execute on function public.list_my_friendship_requests()
  to authenticated, service_role;
grant execute on function public.respond_to_friendship_request(uuid, boolean)
  to authenticated, service_role;
grant execute on function public.withdraw_friendship_request(uuid)
  to authenticated, service_role;
