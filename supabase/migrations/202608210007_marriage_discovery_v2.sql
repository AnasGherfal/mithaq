create or replace function private.marriage_practical_alignment_reasons(
  p_user_a_id uuid,
  p_user_b_id uuid
)
returns text[]
language sql
stable
security definer
set search_path = private, public
as $$
  select coalesce((
    select array_remove(array[
      case when a.living_arrangement = b.living_arrangement then 'living_arrangement' end,
      case when a.children_plan = b.children_plan then 'children_plan' end,
      case when a.work_after_marriage = b.work_after_marriage then 'work_after_marriage' end,
      case when a.wedding_style = b.wedding_style then 'wedding_style' end
    ]::text[], null)
    from private.marriage_practical_priorities a
    join private.marriage_practical_priorities b
      on b.user_id = p_user_b_id
    where a.user_id = p_user_a_id
  ), '{}'::text[]);
$$;

revoke all on function private.marriage_practical_alignment_reasons(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.marriage_practical_alignment_reasons(uuid, uuid)
  to service_role;

drop function if exists public.list_marriage_discovery(integer);

create function public.list_marriage_discovery(p_limit integer default 6)
returns table (
  user_id uuid,
  display_name text,
  about_me text,
  occupation text,
  education text,
  city text,
  origin_region text,
  age_band_id smallint,
  age_band_label text,
  marital_status public.marital_status,
  has_children boolean,
  photo_id uuid,
  photo_display_mode text,
  alignment_reasons text[],
  alignment_count integer
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_my_city text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 12 then
    raise exception 'invalid marriage discovery limit';
  end if;

  if not private.marriage_member_is_discoverable(v_user_id) then
    raise exception 'marriage profile required';
  end if;

  select a.current_city
  into v_my_city
  from public.waitlist_applications a
  where a.user_id = v_user_id;

  return query
  with candidate_rows as (
    select
      p.user_id,
      p.display_name,
      p.about_me,
      case when p.share_occupation then p.occupation else null end as occupation,
      case when p.share_education then p.education else null end as education,
      a.current_city as city,
      case when p.share_origin_region then a.libyan_origin_region else null end as origin_region,
      a.age_band_id,
      age.label as age_band_label,
      a.marital_status,
      a.has_children,
      case
        when photo.id is not null
         and pref.photo_privacy_preference in (
           'discovery_visible'::public.photo_privacy_preference,
           'blurred'::public.photo_privacy_preference
         )
          then photo.id
        else null
      end as photo_id,
      case
        when photo.id is null then 'hidden'
        when pref.photo_privacy_preference = 'discovery_visible'::public.photo_privacy_preference then 'full'
        when pref.photo_privacy_preference = 'blurred'::public.photo_privacy_preference then 'blurred'
        else 'hidden'
      end as photo_display_mode,
      private.marriage_practical_alignment_reasons(v_user_id, p.user_id) as practical_reasons,
      case
        when v_my_city is not null
         and a.current_city is not null
         and lower(v_my_city) = lower(a.current_city)
          then true
        else false
      end as same_city,
      exists (
        select 1
        from private.marriage_discovery_actions incoming
        where incoming.actor_user_id = p.user_id
          and incoming.candidate_user_id = v_user_id
          and incoming.action = 'noticed'::public.marriage_discovery_action
      ) as incoming_noticed
    from public.member_profiles p
    join public.waitlist_applications a
      on a.user_id = p.user_id
    join public.age_bands age
      on age.id = a.age_band_id
    join public.waitlist_preferences pref
      on pref.application_id = a.id
    left join lateral (
      select pp.id
      from public.member_profile_photos pp
      where pp.user_id = p.user_id
        and pp.review_state = 'approved'::public.member_photo_review_state
      order by pp.is_primary desc, pp.position, pp.created_at, pp.id
      limit 1
    ) photo on true
    where p.user_id <> v_user_id
      and private.marriage_member_is_discoverable(p.user_id)
      and private.members_match_hard_constraints(v_user_id, p.user_id)
      and not exists (
        select 1
        from private.controlled_introductions i
        where i.pair_key = case
          when v_user_id::text < p.user_id::text then v_user_id::text || ':' || p.user_id::text
          else p.user_id::text || ':' || v_user_id::text
        end
        and i.status in ('offered', 'mutually_accepted')
      )
      and not exists (
        select 1
        from private.marriage_discovery_actions d
        where d.actor_user_id = v_user_id
          and d.candidate_user_id = p.user_id
          and (
            d.action = 'noticed'::public.marriage_discovery_action
            or d.created_at >= clock_timestamp() - interval '14 days'
          )
      )
  ), scored as (
    select
      c.*,
      case
        when c.same_city then array_prepend('same_city', c.practical_reasons)
        else c.practical_reasons
      end as reasons
    from candidate_rows c
  )
  select
    s.user_id,
    s.display_name,
    s.about_me,
    s.occupation,
    s.education,
    s.city,
    s.origin_region,
    s.age_band_id,
    s.age_band_label,
    s.marital_status,
    s.has_children,
    s.photo_id,
    s.photo_display_mode,
    s.reasons,
    cardinality(s.reasons)::integer
  from scored s
  order by
    s.incoming_noticed desc,
    cardinality(s.reasons) desc,
    s.same_city desc,
    md5(s.user_id::text || current_date::text || v_user_id::text)
  limit p_limit;
end;
$$;

revoke all on function public.list_marriage_discovery(integer) from public, anon;
grant execute on function public.list_marriage_discovery(integer)
  to authenticated, service_role;

create or replace function public.resolve_marriage_discovery_photo_path_for_service(
  p_viewer_user_id uuid,
  p_candidate_user_id uuid,
  p_photo_id uuid
)
returns table (
  storage_path text,
  display_mode text
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_viewer_user_id is null
     or p_candidate_user_id is null
     or p_photo_id is null
     or p_viewer_user_id = p_candidate_user_id then
    raise exception 'marriage discovery photo unavailable';
  end if;

  if not private.marriage_member_is_discoverable(p_viewer_user_id)
     or not private.marriage_member_is_discoverable(p_candidate_user_id)
     or not private.members_match_hard_constraints(p_viewer_user_id, p_candidate_user_id)
     or private.members_are_blocked(p_viewer_user_id, p_candidate_user_id) then
    raise exception 'marriage discovery photo unavailable';
  end if;

  if exists (
    select 1
    from private.controlled_introductions i
    where i.pair_key = case
      when p_viewer_user_id::text < p_candidate_user_id::text
        then p_viewer_user_id::text || ':' || p_candidate_user_id::text
      else p_candidate_user_id::text || ':' || p_viewer_user_id::text
    end
      and i.status in ('offered', 'mutually_accepted')
  ) then
    raise exception 'marriage discovery photo unavailable';
  end if;

  if exists (
    select 1
    from private.marriage_discovery_actions d
    where d.actor_user_id = p_viewer_user_id
      and d.candidate_user_id = p_candidate_user_id
      and (
        d.action = 'noticed'::public.marriage_discovery_action
        or d.created_at >= clock_timestamp() - interval '14 days'
      )
  ) then
    raise exception 'marriage discovery photo unavailable';
  end if;

  return query
  select
    pp.storage_path,
    case
      when pref.photo_privacy_preference = 'discovery_visible'::public.photo_privacy_preference then 'full'
      when pref.photo_privacy_preference = 'blurred'::public.photo_privacy_preference then 'blurred'
      else 'hidden'
    end
  from public.member_profile_photos pp
  join public.waitlist_applications a
    on a.user_id = pp.user_id
  join public.waitlist_preferences pref
    on pref.application_id = a.id
  where pp.id = p_photo_id
    and pp.user_id = p_candidate_user_id
    and pp.review_state = 'approved'::public.member_photo_review_state
    and pref.photo_privacy_preference in (
      'discovery_visible'::public.photo_privacy_preference,
      'blurred'::public.photo_privacy_preference
    )
    and pp.id = (
      select candidate_photo.id
      from public.member_profile_photos candidate_photo
      where candidate_photo.user_id = p_candidate_user_id
        and candidate_photo.review_state = 'approved'::public.member_photo_review_state
      order by candidate_photo.is_primary desc,
               candidate_photo.position,
               candidate_photo.created_at,
               candidate_photo.id
      limit 1
    );

  if not found then
    raise exception 'marriage discovery photo unavailable';
  end if;
end;
$$;

revoke all on function public.resolve_marriage_discovery_photo_path_for_service(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.resolve_marriage_discovery_photo_path_for_service(uuid, uuid, uuid)
  to service_role;

create or replace function public.list_introduction_photo_refs(
  p_introduction_id uuid
)
returns table (
  photo_id uuid,
  position smallint,
  is_primary boolean
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_viewer_user_id uuid := auth.uid();
  v_target_user_id uuid;
  v_status public.introduction_status;
  v_expires_at timestamptz;
begin
  if v_viewer_user_id is null then
    raise exception 'authentication required';
  end if;

  select
    case
      when i.user_a_id = v_viewer_user_id then i.user_b_id
      when i.user_b_id = v_viewer_user_id then i.user_a_id
      else null
    end,
    i.status,
    i.expires_at
  into v_target_user_id, v_status, v_expires_at
  from private.controlled_introductions i
  where i.id = p_introduction_id;

  if v_target_user_id is null then
    raise exception 'introduction photos unavailable';
  end if;

  if v_status <> 'mutually_accepted'::public.introduction_status
     or v_expires_at <= clock_timestamp()
     or private.members_are_blocked(v_viewer_user_id, v_target_user_id)
     or not private.member_can_participate(v_viewer_user_id)
     or not private.member_can_participate(v_target_user_id) then
    return;
  end if;

  if not exists (
    select 1
    from public.waitlist_applications a
    join public.waitlist_preferences pref
      on pref.application_id = a.id
    where a.user_id = v_target_user_id
      and pref.photo_privacy_preference in (
        'discovery_visible'::public.photo_privacy_preference,
        'blurred'::public.photo_privacy_preference,
        'after_mutual_interest'::public.photo_privacy_preference
      )
  ) then
    return;
  end if;

  return query
  select
    p.id,
    p.position,
    p.is_primary
  from public.member_profile_photos p
  where p.user_id = v_target_user_id
    and p.review_state = 'approved'::public.member_photo_review_state
  order by p.is_primary desc, p.position, p.created_at, p.id;
end;
$$;

create or replace function public.resolve_introduction_photo_path_for_service(
  p_viewer_user_id uuid,
  p_introduction_id uuid,
  p_photo_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_target_user_id uuid;
  v_status public.introduction_status;
  v_expires_at timestamptz;
  v_storage_path text;
begin
  if p_viewer_user_id is null
     or p_introduction_id is null
     or p_photo_id is null then
    raise exception 'introduction photo input required';
  end if;

  select
    case
      when i.user_a_id = p_viewer_user_id then i.user_b_id
      when i.user_b_id = p_viewer_user_id then i.user_a_id
      else null
    end,
    i.status,
    i.expires_at
  into v_target_user_id, v_status, v_expires_at
  from private.controlled_introductions i
  where i.id = p_introduction_id;

  if v_target_user_id is null
     or v_status <> 'mutually_accepted'::public.introduction_status
     or v_expires_at <= clock_timestamp()
     or private.members_are_blocked(p_viewer_user_id, v_target_user_id)
     or not private.member_can_participate(p_viewer_user_id)
     or not private.member_can_participate(v_target_user_id)
     or not exists (
       select 1
       from public.waitlist_applications a
       join public.waitlist_preferences pref
         on pref.application_id = a.id
       where a.user_id = v_target_user_id
         and pref.photo_privacy_preference in (
           'discovery_visible'::public.photo_privacy_preference,
           'blurred'::public.photo_privacy_preference,
           'after_mutual_interest'::public.photo_privacy_preference
         )
     ) then
    raise exception 'introduction photo unavailable';
  end if;

  select p.storage_path
  into v_storage_path
  from public.member_profile_photos p
  where p.id = p_photo_id
    and p.user_id = v_target_user_id
    and p.review_state = 'approved'::public.member_photo_review_state;

  if v_storage_path is null then
    raise exception 'introduction photo unavailable';
  end if;

  return v_storage_path;
end;
$$;

revoke all on function public.list_introduction_photo_refs(uuid)
  from public, anon;
grant execute on function public.list_introduction_photo_refs(uuid)
  to authenticated, service_role;

revoke all on function public.resolve_introduction_photo_path_for_service(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.resolve_introduction_photo_path_for_service(uuid, uuid, uuid)
  to service_role;
