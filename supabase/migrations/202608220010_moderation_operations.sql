create table private.moderation_staff (
  user_id uuid primary key references public.users(id) on delete cascade,
  role text not null check (role in ('reviewer', 'moderator', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table private.moderation_action_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.users(id) on delete restrict,
  actor_role text not null check (actor_role in ('reviewer', 'moderator', 'admin')),
  action_type text not null check (char_length(action_type) between 1 and 80),
  item_kind text not null check (item_kind in ('profile', 'photo', 'report', 'member')),
  item_id uuid not null,
  target_user_id uuid not null references public.users(id) on delete restrict,
  reason_code text check (reason_code is null or char_length(reason_code) <= 80),
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default clock_timestamp(),
  check (jsonb_typeof(metadata) = 'object')
);

create index moderation_action_log_target_time_idx
  on private.moderation_action_log (target_user_id, recorded_at desc, id desc);

create index moderation_action_log_actor_time_idx
  on private.moderation_action_log (actor_user_id, recorded_at desc, id desc);

create index moderation_action_log_item_idx
  on private.moderation_action_log (item_kind, item_id, recorded_at desc);

create table private.member_moderation_enforcements (
  user_id uuid primary key references public.users(id) on delete cascade,
  enforcement_kind text not null check (enforcement_kind in ('restricted', 'suspended', 'banned')),
  reason_code text not null check (char_length(reason_code) between 1 and 80),
  review_after timestamptz,
  actor_user_id uuid not null references public.users(id) on delete restrict,
  applied_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create index member_moderation_enforcements_review_idx
  on private.member_moderation_enforcements (review_after, user_id)
  where review_after is not null;

revoke all on table private.moderation_staff from public, anon, authenticated;
revoke all on table private.moderation_action_log from public, anon, authenticated;
revoke all on table private.member_moderation_enforcements from public, anon, authenticated;

grant select, insert, update, delete on table private.moderation_staff to service_role;
grant select, insert on table private.moderation_action_log to service_role;
grant select, insert, update, delete on table private.member_moderation_enforcements to service_role;

create or replace function private.current_moderation_role()
returns text
language sql
stable
security definer
set search_path = private
as $$
  select staff.role
  from private.moderation_staff staff
  where staff.user_id = auth.uid()
    and staff.active;
$$;

create or replace function private.moderation_role_can_review(p_role text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_role, '') in ('reviewer', 'moderator', 'admin');
$$;

create or replace function private.moderation_role_can_enforce(p_role text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_role, '') in ('moderator', 'admin');
$$;

create or replace function private.record_moderation_action(
  p_actor_user_id uuid,
  p_actor_role text,
  p_action_type text,
  p_item_kind text,
  p_item_id uuid,
  p_target_user_id uuid,
  p_reason_code text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = private
as $$
declare
  v_id uuid;
  v_action text := nullif(btrim(coalesce(p_action_type, '')), '');
  v_reason text := nullif(btrim(coalesce(p_reason_code, '')), '');
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if p_actor_user_id is null
     or p_item_id is null
     or p_target_user_id is null
     or v_action is null
     or char_length(v_action) > 80
     or p_item_kind not in ('profile', 'photo', 'report', 'member')
     or p_actor_role not in ('reviewer', 'moderator', 'admin')
     or (v_reason is not null and char_length(v_reason) > 80)
     or jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'invalid moderation audit event';
  end if;

  insert into private.moderation_action_log (
    actor_user_id,
    actor_role,
    action_type,
    item_kind,
    item_id,
    target_user_id,
    reason_code,
    metadata
  ) values (
    p_actor_user_id,
    p_actor_role,
    v_action,
    p_item_kind,
    p_item_id,
    p_target_user_id,
    v_reason,
    v_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function private.close_member_relationships_for_moderation(
  p_user_id uuid,
  p_actor_user_id uuid,
  p_actor_role text
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_conversation record;
  v_introduction record;
  v_actor_reference text := left(
    'moderation:' || coalesce(p_actor_role, 'moderator') || ':' || coalesce(p_actor_user_id::text, 'unknown'),
    120
  );
begin
  for v_conversation in
    select c.id
    from private.introduction_conversations c
    where c.status = 'open'::public.conversation_status
      and (c.user_a_id = p_user_id or c.user_b_id = p_user_id)
    for update
  loop
    update private.introduction_conversations
    set status = 'closed'::public.conversation_status,
        closed_at = clock_timestamp()
    where id = v_conversation.id;

    insert into private.conversation_events (
      conversation_id,
      event_type,
      actor_user_id
    ) values (
      v_conversation.id,
      'closed',
      p_actor_user_id
    );
  end loop;

  for v_introduction in
    select i.id, i.status
    from private.controlled_introductions i
    where i.status in ('offered', 'mutually_accepted')
      and (i.user_a_id = p_user_id or i.user_b_id = p_user_id)
    for update
  loop
    update private.controlled_introductions
    set status = case
          when v_introduction.status = 'offered'::public.introduction_status
            then 'cancelled'::public.introduction_status
          else 'closed'::public.introduction_status
        end,
        closed_at = clock_timestamp()
    where id = v_introduction.id;

    insert into private.controlled_introduction_events (
      introduction_id,
      event_type,
      actor_user_id,
      actor_reference
    ) values (
      v_introduction.id,
      case
        when v_introduction.status = 'offered'::public.introduction_status then 'cancelled'
        else 'closed'
      end,
      p_actor_user_id,
      v_actor_reference
    );
  end loop;
end;
$$;

create or replace function public.get_my_moderation_access()
returns table (
  moderation_role text,
  can_review boolean,
  can_enforce boolean
)
language plpgsql
stable
security definer
set search_path = private
as $$
declare
  v_role text := private.current_moderation_role();
begin
  if v_role is null then
    return;
  end if;

  return query
  select
    v_role,
    private.moderation_role_can_review(v_role),
    private.moderation_role_can_enforce(v_role);
end;
$$;

create or replace function public.list_moderation_queue(
  p_kind text default null,
  p_limit integer default 50
)
returns table (
  item_kind text,
  item_id uuid,
  target_user_id uuid,
  reporter_user_id uuid,
  state text,
  category text,
  display_label text,
  queued_at timestamptz,
  priority smallint
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_role text := private.current_moderation_role();
  v_kind text := nullif(lower(btrim(coalesce(p_kind, ''))), '');
begin
  if not private.moderation_role_can_review(v_role) then
    raise exception 'moderation access required';
  end if;

  if v_kind is not null and v_kind not in ('profile', 'photo', 'report') then
    raise exception 'invalid moderation queue kind';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'moderation queue limit must be between 1 and 100';
  end if;

  return query
  select queue.item_kind,
         queue.item_id,
         queue.target_user_id,
         queue.reporter_user_id,
         queue.state,
         queue.category,
         queue.display_label,
         queue.queued_at,
         queue.priority
  from (
    select
      'report'::text as item_kind,
      report.id as item_id,
      report.target_user_id,
      report.reporter_user_id,
      report.status::text as state,
      report.category::text as category,
      coalesce(target_profile.display_name, 'Member')::text as display_label,
      report.reported_at as queued_at,
      10::smallint as priority
    from public.safety_reports report
    left join public.member_profiles target_profile
      on target_profile.user_id = report.target_user_id
    where report.status in ('submitted', 'triaged', 'investigating')

    union all

    select
      'photo'::text,
      photo.id,
      photo.user_id,
      null::uuid,
      photo.review_state::text,
      null::text,
      coalesce(profile.display_name, 'Member')::text,
      photo.updated_at,
      20::smallint
    from public.member_profile_photos photo
    left join public.member_profiles profile on profile.user_id = photo.user_id
    where photo.review_state in ('pending', 'needs_changes')

    union all

    select
      'profile'::text,
      review.user_id,
      review.user_id,
      null::uuid,
      review.state::text,
      null::text,
      coalesce(profile.display_name, 'Member')::text,
      review.updated_at,
      30::smallint
    from public.member_profile_reviews review
    left join public.member_profiles profile on profile.user_id = review.user_id
    where review.state in ('pending', 'needs_changes')
  ) queue
  where v_kind is null or queue.item_kind = v_kind
  order by queue.priority, queue.queued_at, queue.item_id
  limit p_limit;
end;
$$;

create or replace function public.get_moderation_case(
  p_kind text,
  p_item_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_role text := private.current_moderation_role();
  v_kind text := lower(btrim(coalesce(p_kind, '')));
  v_result jsonb;
begin
  if not private.moderation_role_can_review(v_role) then
    raise exception 'moderation access required';
  end if;

  if p_item_id is null or v_kind not in ('profile', 'photo', 'report') then
    raise exception 'invalid moderation case';
  end if;

  if v_kind = 'profile' then
    select jsonb_build_object(
      'kind', 'profile',
      'itemId', review.user_id,
      'targetUserId', review.user_id,
      'state', review.state::text,
      'reviewAfter', review.review_after,
      'displayName', profile.display_name,
      'aboutMe', profile.about_me,
      'occupation', profile.occupation,
      'education', profile.education,
      'city', application.current_city,
      'maritalStatus', application.marital_status::text,
      'hasChildren', application.has_children,
      'profileCompletedAt', profile.profile_completed_at,
      'updatedAt', review.updated_at
    )
    into v_result
    from public.member_profile_reviews review
    join public.member_profiles profile on profile.user_id = review.user_id
    left join public.waitlist_applications application on application.user_id = review.user_id
    where review.user_id = p_item_id;
  elsif v_kind = 'photo' then
    select jsonb_build_object(
      'kind', 'photo',
      'itemId', photo.id,
      'targetUserId', photo.user_id,
      'state', photo.review_state::text,
      'reviewAfter', photo.review_after,
      'position', photo.position,
      'isPrimary', photo.is_primary,
      'displayName', profile.display_name,
      'createdAt', photo.created_at,
      'updatedAt', photo.updated_at
    )
    into v_result
    from public.member_profile_photos photo
    left join public.member_profiles profile on profile.user_id = photo.user_id
    where photo.id = p_item_id;
  else
    select jsonb_build_object(
      'kind', 'report',
      'itemId', report.id,
      'targetUserId', report.target_user_id,
      'reporterUserId', report.reporter_user_id,
      'state', report.status::text,
      'category', report.category::text,
      'details', report.details,
      'targetDisplayName', target_profile.display_name,
      'reporterDisplayName', reporter_profile.display_name,
      'reportedAt', report.reported_at,
      'updatedAt', report.status_updated_at
    )
    into v_result
    from public.safety_reports report
    left join public.member_profiles target_profile on target_profile.user_id = report.target_user_id
    left join public.member_profiles reporter_profile on reporter_profile.user_id = report.reporter_user_id
    where report.id = p_item_id;
  end if;

  return v_result;
end;
$$;

create or replace function public.list_moderation_audit(
  p_target_user_id uuid,
  p_limit integer default 30
)
returns table (
  action_id uuid,
  actor_user_id uuid,
  actor_role text,
  action_type text,
  item_kind text,
  item_id uuid,
  reason_code text,
  metadata jsonb,
  recorded_at timestamptz
)
language plpgsql
stable
security definer
set search_path = private
as $$
declare
  v_role text := private.current_moderation_role();
begin
  if not private.moderation_role_can_review(v_role) then
    raise exception 'moderation access required';
  end if;

  if p_target_user_id is null or p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'invalid moderation audit query';
  end if;

  return query
  select log.id,
         log.actor_user_id,
         log.actor_role,
         log.action_type,
         log.item_kind,
         log.item_id,
         log.reason_code,
         log.metadata,
         log.recorded_at
  from private.moderation_action_log log
  where log.target_user_id = p_target_user_id
  order by log.recorded_at desc, log.id desc
  limit p_limit;
end;
$$;

create or replace function public.moderate_profile_case(
  p_user_id uuid,
  p_state public.member_profile_review_state,
  p_reason_code text default null,
  p_review_after timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.current_moderation_role();
  v_changed boolean;
  v_reason text := nullif(btrim(coalesce(p_reason_code, '')), '');
begin
  if not private.moderation_role_can_review(v_role) then
    raise exception 'moderation access required';
  end if;
  if p_user_id is null or p_state is null or p_user_id = v_actor then
    raise exception 'invalid profile moderation target';
  end if;

  v_changed := public.set_member_profile_review_state(
    p_user_id,
    p_state,
    v_reason,
    left('moderator:' || v_actor::text, 120),
    p_review_after
  );

  if v_changed then
    perform private.record_moderation_action(
      v_actor,
      v_role,
      'profile_' || p_state::text,
      'profile',
      p_user_id,
      p_user_id,
      v_reason,
      jsonb_build_object('reviewAfter', p_review_after)
    );
  end if;

  return v_changed;
end;
$$;

create or replace function public.moderate_photo_case(
  p_photo_id uuid,
  p_state public.member_photo_review_state,
  p_reason_code text default null,
  p_review_after timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.current_moderation_role();
  v_target uuid;
  v_changed boolean;
  v_reason text := nullif(btrim(coalesce(p_reason_code, '')), '');
begin
  if not private.moderation_role_can_review(v_role) then
    raise exception 'moderation access required';
  end if;

  select photo.user_id into v_target
  from public.member_profile_photos photo
  where photo.id = p_photo_id;

  if v_target is null or v_target = v_actor or p_state is null then
    raise exception 'invalid photo moderation target';
  end if;

  v_changed := public.review_member_photo(
    p_photo_id,
    p_state,
    p_review_after,
    left('moderator:' || v_actor::text, 120)
  );

  if v_changed then
    perform private.record_moderation_action(
      v_actor,
      v_role,
      'photo_' || p_state::text,
      'photo',
      p_photo_id,
      v_target,
      v_reason,
      jsonb_build_object('reviewAfter', p_review_after)
    );
  end if;

  return v_changed;
end;
$$;

create or replace function public.moderate_report_case(
  p_report_id uuid,
  p_to_status public.safety_report_status,
  p_reason_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.current_moderation_role();
  v_target uuid;
  v_changed boolean;
  v_reason text := nullif(btrim(coalesce(p_reason_code, '')), '');
begin
  if not private.moderation_role_can_enforce(v_role) then
    raise exception 'moderation enforcement access required';
  end if;

  select report.target_user_id into v_target
  from public.safety_reports report
  where report.id = p_report_id;

  if v_target is null or v_target = v_actor or p_to_status is null then
    raise exception 'invalid report moderation target';
  end if;

  v_changed := public.transition_safety_report(
    p_report_id,
    p_to_status,
    v_reason,
    left('moderator:' || v_actor::text, 120)
  );

  if v_changed then
    perform private.record_moderation_action(
      v_actor,
      v_role,
      'report_' || p_to_status::text,
      'report',
      p_report_id,
      v_target,
      v_reason,
      '{}'::jsonb
    );
  end if;

  return v_changed;
end;
$$;

create or replace function public.moderate_member_enforcement(
  p_user_id uuid,
  p_action text,
  p_reason_code text default null,
  p_review_after timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.current_moderation_role();
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_reason text := nullif(btrim(coalesce(p_reason_code, '')), '');
  v_previous text;
  v_account_status public.account_status;
begin
  if not private.moderation_role_can_enforce(v_role) then
    raise exception 'moderation enforcement access required';
  end if;

  if p_user_id is null or p_user_id = v_actor
     or v_action not in ('restrict', 'suspend', 'ban', 'restore')
     or (v_action <> 'restore' and (v_reason is null or char_length(v_reason) > 80))
     or (v_reason is not null and char_length(v_reason) > 80) then
    raise exception 'invalid moderation enforcement';
  end if;

  select u.account_status into v_account_status
  from public.users u
  where u.id = p_user_id
  for update;

  if not found or v_account_status in ('deletion_pending', 'deleted') then
    raise exception 'member unavailable for moderation';
  end if;

  select enforcement.enforcement_kind into v_previous
  from private.member_moderation_enforcements enforcement
  where enforcement.user_id = p_user_id
  for update;

  if v_action = 'restore' then
    if v_previous is null then
      return false;
    end if;

    perform public.set_member_safety_state(
      p_user_id,
      'clear'::public.member_safety_state,
      null,
      left('moderator:' || v_actor::text, 120),
      null
    );

    if v_previous = 'banned' and v_account_status = 'suspended'::public.account_status then
      update public.users
      set account_status = 'active'::public.account_status,
          updated_at = clock_timestamp()
      where id = p_user_id;
    end if;

    delete from private.member_moderation_enforcements
    where user_id = p_user_id;

    perform private.record_moderation_action(
      v_actor,
      v_role,
      'member_restored',
      'member',
      p_user_id,
      p_user_id,
      v_reason,
      jsonb_build_object('previousEnforcement', v_previous)
    );

    return true;
  end if;

  perform public.set_member_safety_state(
    p_user_id,
    case
      when v_action = 'restrict' then 'restricted'::public.member_safety_state
      else 'suspended'::public.member_safety_state
    end,
    v_reason,
    left('moderator:' || v_actor::text, 120),
    p_review_after
  );

  if v_action = 'ban' then
    update public.users
    set account_status = 'suspended'::public.account_status,
        updated_at = clock_timestamp()
    where id = p_user_id;
  elsif v_previous = 'banned' and v_account_status = 'suspended'::public.account_status then
    update public.users
    set account_status = 'active'::public.account_status,
        updated_at = clock_timestamp()
    where id = p_user_id;
  end if;

  insert into private.member_moderation_enforcements (
    user_id,
    enforcement_kind,
    reason_code,
    review_after,
    actor_user_id,
    applied_at,
    updated_at
  ) values (
    p_user_id,
    case v_action
      when 'restrict' then 'restricted'
      when 'suspend' then 'suspended'
      else 'banned'
    end,
    v_reason,
    p_review_after,
    v_actor,
    clock_timestamp(),
    clock_timestamp()
  )
  on conflict (user_id) do update
  set enforcement_kind = excluded.enforcement_kind,
      reason_code = excluded.reason_code,
      review_after = excluded.review_after,
      actor_user_id = excluded.actor_user_id,
      updated_at = excluded.updated_at;

  perform private.close_member_relationships_for_moderation(p_user_id, v_actor, v_role);

  perform private.record_moderation_action(
    v_actor,
    v_role,
    'member_' || v_action,
    'member',
    p_user_id,
    p_user_id,
    v_reason,
    jsonb_build_object('previousEnforcement', v_previous, 'reviewAfter', p_review_after)
  );

  return true;
end;
$$;

revoke all on function private.current_moderation_role() from public, anon, authenticated;
revoke all on function private.moderation_role_can_review(text) from public, anon, authenticated;
revoke all on function private.moderation_role_can_enforce(text) from public, anon, authenticated;
revoke all on function private.record_moderation_action(uuid, text, text, text, uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function private.close_member_relationships_for_moderation(uuid, uuid, text) from public, anon, authenticated;

grant execute on function private.current_moderation_role() to service_role;
grant execute on function private.moderation_role_can_review(text) to service_role;
grant execute on function private.moderation_role_can_enforce(text) to service_role;
grant execute on function private.record_moderation_action(uuid, text, text, text, uuid, uuid, text, jsonb) to service_role;
grant execute on function private.close_member_relationships_for_moderation(uuid, uuid, text) to service_role;

revoke all on function public.get_my_moderation_access() from public, anon;
revoke all on function public.list_moderation_queue(text, integer) from public, anon;
revoke all on function public.get_moderation_case(text, uuid) from public, anon;
revoke all on function public.list_moderation_audit(uuid, integer) from public, anon;
revoke all on function public.moderate_profile_case(uuid, public.member_profile_review_state, text, timestamptz) from public, anon;
revoke all on function public.moderate_photo_case(uuid, public.member_photo_review_state, text, timestamptz) from public, anon;
revoke all on function public.moderate_report_case(uuid, public.safety_report_status, text) from public, anon;
revoke all on function public.moderate_member_enforcement(uuid, text, text, timestamptz) from public, anon;

grant execute on function public.get_my_moderation_access() to authenticated, service_role;
grant execute on function public.list_moderation_queue(text, integer) to authenticated, service_role;
grant execute on function public.get_moderation_case(text, uuid) to authenticated, service_role;
grant execute on function public.list_moderation_audit(uuid, integer) to authenticated, service_role;
grant execute on function public.moderate_profile_case(uuid, public.member_profile_review_state, text, timestamptz) to authenticated, service_role;
grant execute on function public.moderate_photo_case(uuid, public.member_photo_review_state, text, timestamptz) to authenticated, service_role;
grant execute on function public.moderate_report_case(uuid, public.safety_report_status, text) to authenticated, service_role;
grant execute on function public.moderate_member_enforcement(uuid, text, text, timestamptz) to authenticated, service_role;
