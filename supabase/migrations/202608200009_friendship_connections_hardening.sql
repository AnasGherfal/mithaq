alter table private.friendship_requests
  add column if not exists expires_at timestamptz;

update private.friendship_requests
set expires_at = created_at + interval '14 days'
where expires_at is null;

alter table private.friendship_requests
  alter column expires_at set default (clock_timestamp() + interval '14 days'),
  alter column expires_at set not null;

create index if not exists friendship_requests_pending_expiry_idx
  on private.friendship_requests (expires_at, id)
  where status = 'pending';

create table private.friendship_connections (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references public.users(id) on delete cascade,
  user_high_id uuid not null references public.users(id) on delete cascade,
  accepted_request_id uuid not null unique references private.friendship_requests(id) on delete cascade,
  connected_at timestamptz not null default clock_timestamp(),
  check (user_low_id < user_high_id),
  unique (user_low_id, user_high_id)
);

revoke all on table private.friendship_connections from public, anon, authenticated;
grant select, insert, update, delete on table private.friendship_connections to service_role;

insert into private.friendship_connections (
  user_low_id,
  user_high_id,
  accepted_request_id,
  connected_at
)
select
  least(r.requester_user_id, r.recipient_user_id),
  greatest(r.requester_user_id, r.recipient_user_id),
  r.id,
  coalesce(r.responded_at, r.updated_at, r.created_at)
from private.friendship_requests r
where r.status = 'accepted'
on conflict (user_low_id, user_high_id) do nothing;

create or replace function private.expire_friendship_requests_for_user(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_count integer := 0;
begin
  update private.friendship_requests r
  set status = 'expired'::public.friendship_request_status,
      responded_at = coalesce(r.responded_at, clock_timestamp()),
      updated_at = clock_timestamp()
  where r.status = 'pending'::public.friendship_request_status
    and r.expires_at <= clock_timestamp()
    and (r.requester_user_id = p_user_id or r.recipient_user_id = p_user_id);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function private.mark_blocked_friendship_requests()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
begin
  update private.friendship_requests r
  set status = 'blocked'::public.friendship_request_status,
      responded_at = coalesce(r.responded_at, clock_timestamp()),
      updated_at = clock_timestamp()
  where r.status = 'pending'::public.friendship_request_status
    and least(r.requester_user_id, r.recipient_user_id) = least(new.blocker_user_id, new.blocked_user_id)
    and greatest(r.requester_user_id, r.recipient_user_id) = greatest(new.blocker_user_id, new.blocked_user_id);

  return new;
end;
$$;

drop trigger if exists friendship_requests_mark_blocked on public.member_blocks;
create trigger friendship_requests_mark_blocked
after insert on public.member_blocks
for each row execute function private.mark_blocked_friendship_requests();

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

  perform private.expire_friendship_requests_for_user(v_user_id);

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
        from private.friendship_connections c
        where c.user_low_id = least(v_user_id, p.user_id)
          and c.user_high_id = greatest(v_user_id, p.user_id)
      )
      and not exists (
        select 1
        from private.friendship_requests r
        where least(r.requester_user_id, r.recipient_user_id) = least(v_user_id, p.user_id)
          and greatest(r.requester_user_id, r.recipient_user_id) = greatest(v_user_id, p.user_id)
          and (
            r.status = 'pending'::public.friendship_request_status
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

  perform private.expire_friendship_requests_for_user(v_user_id);

  if exists (
    select 1
    from private.friendship_connections c
    where c.user_low_id = least(v_user_id, p_recipient_user_id)
      and c.user_high_id = greatest(v_user_id, p_recipient_user_id)
  ) then
    raise exception 'friendship request unavailable';
  end if;

  if exists (
    select 1
    from private.friendship_requests r
    where least(r.requester_user_id, r.recipient_user_id) = least(v_user_id, p_recipient_user_id)
      and greatest(r.requester_user_id, r.recipient_user_id) = greatest(v_user_id, p_recipient_user_id)
      and (
        r.status = 'pending'::public.friendship_request_status
        or r.created_at >= clock_timestamp() - interval '30 days'
      )
  ) then
    raise exception 'friendship request unavailable';
  end if;

  insert into private.friendship_requests (
    requester_user_id,
    recipient_user_id,
    status,
    expires_at
  ) values (
    v_user_id,
    p_recipient_user_id,
    'pending'::public.friendship_request_status,
    clock_timestamp() + interval '14 days'
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

  perform private.expire_friendship_requests_for_user(v_user_id);

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

  if v_request.expires_at <= clock_timestamp() then
    update private.friendship_requests
    set status = 'expired'::public.friendship_request_status,
        responded_at = clock_timestamp(),
        updated_at = clock_timestamp()
    where id = v_request.id;
    return 'expired'::public.friendship_request_status;
  end if;

  if private.members_are_blocked(v_request.requester_user_id, v_request.recipient_user_id) then
    update private.friendship_requests
    set status = 'blocked'::public.friendship_request_status,
        responded_at = clock_timestamp(),
        updated_at = clock_timestamp()
    where id = v_request.id;
    return 'blocked'::public.friendship_request_status;
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

  if v_new_status = 'accepted'::public.friendship_request_status then
    insert into private.friendship_connections (
      user_low_id,
      user_high_id,
      accepted_request_id
    ) values (
      least(v_request.requester_user_id, v_request.recipient_user_id),
      greatest(v_request.requester_user_id, v_request.recipient_user_id),
      v_request.id
    )
    on conflict (user_low_id, user_high_id) do nothing;
  end if;

  return v_new_status;
end;
$$;

create or replace function public.list_my_friendship_connections()
returns table (
  connection_id uuid,
  counterpart_user_id uuid,
  display_name text,
  city text,
  interests text[],
  connected_at timestamptz
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
    c.id,
    case when c.user_low_id = v_user_id then c.user_high_id else c.user_low_id end,
    p.display_name,
    p.city,
    p.interests,
    c.connected_at
  from private.friendship_connections c
  join public.friendship_profiles p
    on p.user_id = case when c.user_low_id = v_user_id then c.user_high_id else c.user_low_id end
  where (c.user_low_id = v_user_id or c.user_high_id = v_user_id)
    and not private.members_are_blocked(c.user_low_id, c.user_high_id)
    and private.friendship_member_is_eligible(
      case when c.user_low_id = v_user_id then c.user_high_id else c.user_low_id end
    )
  order by c.connected_at desc, c.id desc;
end;
$$;

revoke all on function private.expire_friendship_requests_for_user(uuid)
  from public, anon, authenticated;
revoke all on function private.mark_blocked_friendship_requests()
  from public, anon, authenticated;
grant execute on function private.expire_friendship_requests_for_user(uuid) to service_role;
grant execute on function private.mark_blocked_friendship_requests() to service_role;

revoke all on function public.list_my_friendship_connections() from public, anon;
grant execute on function public.list_my_friendship_connections() to authenticated, service_role;
