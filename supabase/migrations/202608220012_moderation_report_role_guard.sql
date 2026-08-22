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

  if v_kind = 'report' and not private.moderation_role_can_enforce(v_role) then
    raise exception 'moderation enforcement access required';
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
  where (v_kind is null or queue.item_kind = v_kind)
    and (
      queue.item_kind <> 'report'
      or private.moderation_role_can_enforce(v_role)
    )
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

  if v_kind = 'report' and not private.moderation_role_can_enforce(v_role) then
    raise exception 'moderation enforcement access required';
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
    and (
      private.moderation_role_can_enforce(v_role)
      or log.item_kind in ('profile', 'photo')
    )
  order by log.recorded_at desc, log.id desc
  limit p_limit;
end;
$$;
