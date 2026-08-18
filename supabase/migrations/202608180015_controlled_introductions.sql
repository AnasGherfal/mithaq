create type public.introduction_status as enum (
  'offered',
  'mutually_accepted',
  'declined',
  'expired',
  'cancelled',
  'closed'
);

create type public.introduction_decision as enum (
  'pending',
  'accepted',
  'declined'
);

create table private.controlled_introductions (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.users(id) on delete cascade,
  user_b_id uuid not null references public.users(id) on delete cascade,
  pair_key text generated always as (
    case
      when user_a_id::text < user_b_id::text
        then user_a_id::text || ':' || user_b_id::text
      else user_b_id::text || ':' || user_a_id::text
    end
  ) stored,
  user_a_decision public.introduction_decision not null default 'pending',
  user_b_decision public.introduction_decision not null default 'pending',
  status public.introduction_status not null default 'offered',
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  mutually_accepted_at timestamptz,
  closed_at timestamptz,
  created_by text not null check (char_length(created_by) between 1 and 120),
  check (user_a_id <> user_b_id),
  check (expires_at > created_at)
);

create unique index controlled_introductions_active_pair_idx
  on private.controlled_introductions (pair_key)
  where status in ('offered', 'mutually_accepted');

create index controlled_introductions_user_a_time_idx
  on private.controlled_introductions (user_a_id, created_at desc);

create index controlled_introductions_user_b_time_idx
  on private.controlled_introductions (user_b_id, created_at desc);

create table private.controlled_introduction_events (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null references private.controlled_introductions(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'created',
      'accepted',
      'declined',
      'mutually_accepted',
      'expired',
      'cancelled',
      'closed'
    )
  ),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_reference text check (actor_reference is null or char_length(actor_reference) <= 120),
  recorded_at timestamptz not null default clock_timestamp()
);

create index controlled_introduction_events_intro_time_idx
  on private.controlled_introduction_events (introduction_id, recorded_at, id);

revoke all on table private.controlled_introductions from public, anon, authenticated;
revoke all on table private.controlled_introduction_events from public, anon, authenticated;
grant select, insert, update, delete on table private.controlled_introductions to service_role;
grant select, insert on table private.controlled_introduction_events to service_role;

create or replace function public.create_controlled_introduction(
  p_user_a_id uuid,
  p_user_b_id uuid,
  p_expires_at timestamptz default null,
  p_actor_reference text default 'matching-engine'
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_id uuid;
  v_expires_at timestamptz := coalesce(p_expires_at, clock_timestamp() + interval '7 days');
  v_actor_reference text := nullif(btrim(p_actor_reference), '');
begin
  if p_user_a_id is null or p_user_b_id is null or p_user_a_id = p_user_b_id then
    raise exception 'invalid introduction pair';
  end if;

  if v_actor_reference is null or char_length(v_actor_reference) > 120 then
    raise exception 'invalid introduction actor';
  end if;

  if v_expires_at <= clock_timestamp() then
    raise exception 'invalid introduction expiry';
  end if;

  if not private.member_can_participate(p_user_a_id)
     or not private.member_can_participate(p_user_b_id) then
    raise exception 'member not eligible for introduction';
  end if;

  if private.members_are_blocked(p_user_a_id, p_user_b_id) then
    raise exception 'introduction pair blocked';
  end if;

  if exists (
    select 1
    from private.controlled_introductions i
    where i.pair_key = case
      when p_user_a_id::text < p_user_b_id::text
        then p_user_a_id::text || ':' || p_user_b_id::text
      else p_user_b_id::text || ':' || p_user_a_id::text
    end
      and i.status in ('offered', 'mutually_accepted')
  ) then
    raise exception 'active introduction already exists';
  end if;

  insert into private.controlled_introductions (
    user_a_id,
    user_b_id,
    expires_at,
    created_by
  ) values (
    p_user_a_id,
    p_user_b_id,
    v_expires_at,
    v_actor_reference
  )
  returning id into v_id;

  insert into private.controlled_introduction_events (
    introduction_id,
    event_type,
    actor_reference
  ) values (
    v_id,
    'created',
    v_actor_reference
  );

  return v_id;
end;
$$;

create or replace function public.list_my_introductions()
returns table (
  introduction_id uuid,
  status public.introduction_status,
  my_decision public.introduction_decision,
  created_at timestamptz,
  expires_at timestamptz
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
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  return query
  select
    i.id,
    case
      when i.status = 'offered'::public.introduction_status
        and i.expires_at <= clock_timestamp()
        then 'expired'::public.introduction_status
      else i.status
    end,
    case
      when i.user_a_id = v_user_id then i.user_a_decision
      else i.user_b_decision
    end,
    i.created_at,
    i.expires_at
  from private.controlled_introductions i
  where i.user_a_id = v_user_id or i.user_b_id = v_user_id
  order by i.created_at desc;
end;
$$;

create or replace function public.get_introduction_preview(
  p_introduction_id uuid
)
returns table (
  display_name text,
  about_me text,
  occupation text,
  education text,
  gender public.gender,
  age_band_id smallint,
  country_code char(2),
  city text,
  origin_region text,
  marital_status public.marital_status,
  has_children boolean
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_target_user_id uuid;
  v_status public.introduction_status;
  v_expires_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select
    case
      when i.user_a_id = v_user_id then i.user_b_id
      when i.user_b_id = v_user_id then i.user_a_id
      else null
    end,
    i.status,
    i.expires_at
  into v_target_user_id, v_status, v_expires_at
  from private.controlled_introductions i
  where i.id = p_introduction_id;

  if v_target_user_id is null then
    raise exception 'introduction unavailable';
  end if;

  if v_status not in ('offered', 'mutually_accepted')
     or (v_status = 'offered' and v_expires_at <= clock_timestamp()) then
    raise exception 'introduction preview unavailable';
  end if;

  if private.members_are_blocked(v_user_id, v_target_user_id) then
    raise exception 'introduction preview unavailable';
  end if;

  if not private.member_can_participate(v_user_id)
     or not private.member_can_participate(v_target_user_id) then
    raise exception 'introduction preview unavailable';
  end if;

  return query
  select
    p.display_name,
    p.about_me,
    case when p.share_occupation then p.occupation else null end,
    case when p.share_education then p.education else null end,
    a.gender,
    a.age_band_id,
    a.current_country_code,
    a.current_city,
    case when p.share_origin_region then a.libyan_origin_region else null end,
    a.marital_status,
    a.has_children
  from public.member_profiles p
  join public.waitlist_applications a on a.user_id = p.user_id
  where p.user_id = v_target_user_id
    and p.profile_completed_at is not null
    and a.status in ('submitted', 'qualified', 'invited')
    and a.submitted_at is not null
    and a.questionnaire_completed_at is not null;
end;
$$;

create or replace function public.respond_to_introduction(
  p_introduction_id uuid,
  p_accept boolean
)
returns public.introduction_status
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_row private.controlled_introductions%rowtype;
  v_other_user_id uuid;
  v_my_decision public.introduction_decision;
  v_other_decision public.introduction_decision;
  v_new_status public.introduction_status;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_accept is null then
    raise exception 'introduction decision required';
  end if;

  select *
  into v_row
  from private.controlled_introductions i
  where i.id = p_introduction_id
  for update;

  if not found or (v_row.user_a_id <> v_user_id and v_row.user_b_id <> v_user_id) then
    raise exception 'introduction unavailable';
  end if;

  if v_row.status = 'offered' and v_row.expires_at <= clock_timestamp() then
    update private.controlled_introductions
    set status = 'expired',
        closed_at = clock_timestamp()
    where id = p_introduction_id;

    insert into private.controlled_introduction_events (
      introduction_id,
      event_type,
      actor_reference
    ) values (
      p_introduction_id,
      'expired',
      'member-response'
    );

    return 'expired'::public.introduction_status;
  end if;

  if v_row.status <> 'offered'::public.introduction_status then
    return v_row.status;
  end if;

  v_other_user_id := case
    when v_row.user_a_id = v_user_id then v_row.user_b_id
    else v_row.user_a_id
  end;

  if private.members_are_blocked(v_user_id, v_other_user_id)
     or not private.member_can_participate(v_user_id)
     or not private.member_can_participate(v_other_user_id) then
    update private.controlled_introductions
    set status = 'cancelled',
        closed_at = clock_timestamp()
    where id = p_introduction_id;

    insert into private.controlled_introduction_events (
      introduction_id,
      event_type,
      actor_user_id,
      actor_reference
    ) values (
      p_introduction_id,
      'cancelled',
      v_user_id,
      'eligibility-guard'
    );

    return 'cancelled'::public.introduction_status;
  end if;

  v_my_decision := case
    when v_row.user_a_id = v_user_id then v_row.user_a_decision
    else v_row.user_b_decision
  end;

  v_other_decision := case
    when v_row.user_a_id = v_user_id then v_row.user_b_decision
    else v_row.user_a_decision
  end;

  if not p_accept then
    if v_my_decision = 'declined'::public.introduction_decision then
      return 'declined'::public.introduction_status;
    end if;

    update private.controlled_introductions
    set user_a_decision = case
          when user_a_id = v_user_id then 'declined'::public.introduction_decision
          else user_a_decision
        end,
        user_b_decision = case
          when user_b_id = v_user_id then 'declined'::public.introduction_decision
          else user_b_decision
        end,
        status = 'declined',
        closed_at = clock_timestamp()
    where id = p_introduction_id;

    insert into private.controlled_introduction_events (
      introduction_id,
      event_type,
      actor_user_id,
      actor_reference
    ) values (
      p_introduction_id,
      'declined',
      v_user_id,
      'member'
    );

    return 'declined'::public.introduction_status;
  end if;

  if v_my_decision = 'accepted'::public.introduction_decision then
    return case
      when v_other_decision = 'accepted'::public.introduction_decision
        then 'mutually_accepted'::public.introduction_status
      else 'offered'::public.introduction_status
    end;
  end if;

  update private.controlled_introductions
  set user_a_decision = case
        when user_a_id = v_user_id then 'accepted'::public.introduction_decision
        else user_a_decision
      end,
      user_b_decision = case
        when user_b_id = v_user_id then 'accepted'::public.introduction_decision
        else user_b_decision
      end
  where id = p_introduction_id;

  insert into private.controlled_introduction_events (
    introduction_id,
    event_type,
    actor_user_id,
    actor_reference
  ) values (
    p_introduction_id,
    'accepted',
    v_user_id,
    'member'
  );

  if v_other_decision = 'accepted'::public.introduction_decision then
    update private.controlled_introductions
    set status = 'mutually_accepted',
        mutually_accepted_at = clock_timestamp()
    where id = p_introduction_id;

    insert into private.controlled_introduction_events (
      introduction_id,
      event_type,
      actor_reference
    ) values (
      p_introduction_id,
      'mutually_accepted',
      'state-machine'
    );

    v_new_status := 'mutually_accepted'::public.introduction_status;
  else
    v_new_status := 'offered'::public.introduction_status;
  end if;

  return v_new_status;
end;
$$;

create or replace function public.close_controlled_introduction(
  p_introduction_id uuid,
  p_actor_reference text default 'system'
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_actor_reference text := nullif(btrim(p_actor_reference), '');
  v_changed boolean := false;
begin
  if v_actor_reference is null or char_length(v_actor_reference) > 120 then
    raise exception 'invalid introduction actor';
  end if;

  update private.controlled_introductions
  set status = 'closed',
      closed_at = clock_timestamp()
  where id = p_introduction_id
    and status in ('offered', 'mutually_accepted');

  v_changed := found;

  if v_changed then
    insert into private.controlled_introduction_events (
      introduction_id,
      event_type,
      actor_reference
    ) values (
      p_introduction_id,
      'closed',
      v_actor_reference
    );
  end if;

  return v_changed;
end;
$$;

create or replace function private.cancel_introductions_after_block()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  with cancelled as (
    update private.controlled_introductions i
    set status = 'cancelled',
        closed_at = clock_timestamp()
    where i.status in ('offered', 'mutually_accepted')
      and (
        (i.user_a_id = new.blocker_user_id and i.user_b_id = new.blocked_user_id)
        or (i.user_a_id = new.blocked_user_id and i.user_b_id = new.blocker_user_id)
      )
    returning i.id
  )
  insert into private.controlled_introduction_events (
    introduction_id,
    event_type,
    actor_user_id,
    actor_reference
  )
  select
    c.id,
    'cancelled',
    new.blocker_user_id,
    'member-block'
  from cancelled c;

  return new;
end;
$$;

create trigger member_blocks_cancel_active_introductions
  after insert on public.member_blocks
  for each row
  execute function private.cancel_introductions_after_block();

revoke all on function public.create_controlled_introduction(uuid, uuid, timestamptz, text)
from public, anon, authenticated;
grant execute on function public.create_controlled_introduction(uuid, uuid, timestamptz, text)
to service_role;

revoke all on function public.close_controlled_introduction(uuid, text)
from public, anon, authenticated;
grant execute on function public.close_controlled_introduction(uuid, text)
to service_role;

revoke all on function public.list_my_introductions() from public, anon;
grant execute on function public.list_my_introductions() to authenticated;

revoke all on function public.get_introduction_preview(uuid) from public, anon;
grant execute on function public.get_introduction_preview(uuid) to authenticated;

revoke all on function public.respond_to_introduction(uuid, boolean) from public, anon;
grant execute on function public.respond_to_introduction(uuid, boolean) to authenticated;

revoke all on function private.cancel_introductions_after_block() from public, anon, authenticated;
grant execute on function private.cancel_introductions_after_block() to service_role;
