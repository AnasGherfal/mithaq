create or replace function private.introduction_member_photo_is_visible(
  p_introduction_id uuid,
  p_owner_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from private.controlled_introductions i
    left join public.marriage_visibility_settings vis
      on vis.user_id = p_owner_user_id
    where i.id = p_introduction_id
      and p_owner_user_id in (i.user_a_id, i.user_b_id)
      and i.status in (
        'offered'::public.introduction_status,
        'mutually_accepted'::public.introduction_status
      )
      and i.expires_at > clock_timestamp()
      and (
        coalesce(
          vis.visibility_mode,
          'private'::public.marriage_visibility_mode
        ) = 'standard'::public.marriage_visibility_mode
        or (
          i.status = 'mutually_accepted'::public.introduction_status
          and private.introduction_member_photo_is_revealed(
            p_introduction_id,
            p_owner_user_id
          )
        )
      )
  );
$$;

revoke all on function private.introduction_member_photo_is_visible(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.introduction_member_photo_is_visible(uuid, uuid)
  to service_role;

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

  if not private.members_match_hard_constraints(p_user_a_id, p_user_b_id) then
    raise exception 'member pair not eligible for introduction';
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

revoke all on function public.create_controlled_introduction(uuid, uuid, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.create_controlled_introduction(uuid, uuid, timestamptz, text)
  to service_role;

drop function if exists public.get_introduction_preview(uuid);

create function public.get_introduction_preview(
  p_introduction_id uuid
)
returns table (
  display_name text,
  about_me text,
  occupation text,
  education text,
  gender public.gender,
  age_band_id smallint,
  age_band_label text,
  country_code char(2),
  city text,
  origin_region text,
  marital_status public.marital_status,
  has_children boolean,
  primary_photo_url text,
  presentation_mode text,
  alignment_reasons text[],
  real_person_verified boolean,
  age_18_plus_verified boolean,
  identity_verified boolean
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
  v_my_city text;
  v_target_city text;
  v_open_profile boolean := false;
  v_reasons text[] := '{}'::text[];
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
     or v_expires_at <= clock_timestamp()
     or private.members_are_blocked(v_user_id, v_target_user_id)
     or private.marriage_pair_is_hidden(v_user_id, v_target_user_id)
     or not private.member_can_participate(v_user_id)
     or not private.member_can_participate(v_target_user_id) then
    raise exception 'introduction preview unavailable';
  end if;

  select a.current_city into v_my_city
  from public.waitlist_applications a
  where a.user_id = v_user_id;

  select a.current_city into v_target_city
  from public.waitlist_applications a
  where a.user_id = v_target_user_id;

  select coalesce(
    (
      select vis.visibility_mode = 'standard'::public.marriage_visibility_mode
      from public.marriage_visibility_settings vis
      where vis.user_id = v_target_user_id
    ),
    false
  ) into v_open_profile;

  v_reasons := private.marriage_practical_alignment_reasons(v_user_id, v_target_user_id);
  if v_my_city is not null
     and v_target_city is not null
     and lower(v_my_city) = lower(v_target_city) then
    v_reasons := array_prepend('same_city', v_reasons);
  end if;

  return query
  select
    p.display_name,
    p.about_me,
    case when p.share_occupation or v_open_profile then p.occupation else null end,
    case when p.share_education or v_open_profile then p.education else null end,
    a.gender,
    a.age_band_id,
    age.label,
    a.current_country_code,
    a.current_city,
    case when p.share_origin_region or v_open_profile then a.libyan_origin_region else null end,
    a.marital_status,
    a.has_children,
    case
      when private.introduction_member_photo_is_visible(p_introduction_id, v_target_user_id) then (
        select
          'mithaq-introduction-photo://' ||
          p_introduction_id::text ||
          '/' ||
          photo.photo_id::text
        from public.list_introduction_photo_refs(p_introduction_id) photo
        order by photo.is_primary desc, photo."position", photo.photo_id
        limit 1
      )
      else null
    end,
    case when v_open_profile then 'open_profile'::text else 'controlled_reveal'::text end,
    v_reasons,
    trust.real_person_verified,
    trust.age_18_plus_verified,
    trust.identity_verified
  from public.member_profiles p
  join public.waitlist_applications a on a.user_id = p.user_id
  join public.age_bands age on age.id = a.age_band_id
  cross join lateral private.member_visible_trust_badges(p.user_id) trust
  where p.user_id = v_target_user_id
    and p.profile_completed_at is not null
    and a.status in ('submitted', 'qualified', 'invited')
    and a.submitted_at is not null
    and a.questionnaire_completed_at is not null;
end;
$$;

revoke all on function public.get_introduction_preview(uuid) from public, anon;
grant execute on function public.get_introduction_preview(uuid)
  to authenticated, service_role;

create or replace function public.list_introduction_photo_refs(
  p_introduction_id uuid
)
returns table (
  photo_id uuid,
  "position" smallint,
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

  if v_status not in ('offered', 'mutually_accepted')
     or v_expires_at <= clock_timestamp()
     or private.members_are_blocked(v_viewer_user_id, v_target_user_id)
     or private.marriage_pair_is_hidden(v_viewer_user_id, v_target_user_id)
     or not private.member_can_participate(v_viewer_user_id)
     or not private.member_can_participate(v_target_user_id)
     or not private.introduction_member_photo_is_visible(p_introduction_id, v_target_user_id) then
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

revoke all on function public.list_introduction_photo_refs(uuid)
  from public, anon;
grant execute on function public.list_introduction_photo_refs(uuid)
  to authenticated, service_role;

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
     or v_status not in ('offered', 'mutually_accepted')
     or v_expires_at <= clock_timestamp()
     or private.members_are_blocked(p_viewer_user_id, v_target_user_id)
     or private.marriage_pair_is_hidden(p_viewer_user_id, v_target_user_id)
     or not private.member_can_participate(p_viewer_user_id)
     or not private.member_can_participate(v_target_user_id)
     or not private.introduction_member_photo_is_visible(
       p_introduction_id,
       v_target_user_id
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

revoke all on function public.resolve_introduction_photo_path_for_service(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.resolve_introduction_photo_path_for_service(uuid, uuid, uuid)
  to service_role;

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
     or private.marriage_pair_is_hidden(v_user_id, v_other_user_id)
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
      'eligibility-privacy-guard'
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

revoke all on function public.respond_to_introduction(uuid, boolean)
  from public, anon;
grant execute on function public.respond_to_introduction(uuid, boolean)
  to authenticated, service_role;
