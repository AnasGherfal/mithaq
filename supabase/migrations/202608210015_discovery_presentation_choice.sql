-- Existing preview-era standard values were created before the product had a
-- clear open-profile consent. Reset everyone to the privacy-first default once
-- before giving the setting its new user-facing meaning.
update public.marriage_visibility_settings
set visibility_mode = 'private'::public.marriage_visibility_mode,
    updated_at = clock_timestamp()
where visibility_mode <> 'private'::public.marriage_visibility_mode;

create or replace function public.set_my_marriage_visibility(
  p_visibility_mode public.marriage_visibility_mode
)
returns public.marriage_visibility_mode
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

  if p_visibility_mode is null then
    raise exception 'visibility choice required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) or not exists (
    select 1
    from public.member_connection_spaces s
    where s.user_id = v_user_id
      and s.space = 'marriage'::public.connection_space
      and s.membership_state = 'active'::public.connection_space_membership_state
  ) then
    raise exception 'marriage space unavailable';
  end if;

  insert into public.marriage_visibility_settings (
    user_id,
    visibility_mode,
    updated_at
  ) values (
    v_user_id,
    p_visibility_mode,
    clock_timestamp()
  )
  on conflict (user_id) do update
  set visibility_mode = excluded.visibility_mode,
      updated_at = excluded.updated_at;

  return p_visibility_mode;
end;
$$;

revoke all on function public.set_my_marriage_visibility(public.marriage_visibility_mode)
  from public, anon;
grant execute on function public.set_my_marriage_visibility(public.marriage_visibility_mode)
  to authenticated, service_role;

create or replace function public.list_marriage_discovery(p_limit integer default 6)
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
  alignment_count integer,
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
      coalesce(vis.visibility_mode, 'private'::public.marriage_visibility_mode)
        = 'standard'::public.marriage_visibility_mode as open_profile,
      p.display_name,
      p.about_me,
      p.occupation,
      p.education,
      a.current_city as city,
      a.libyan_origin_region as origin_region,
      a.age_band_id,
      age.label as age_band_label,
      a.marital_status,
      a.has_children,
      photo.id as approved_photo_id,
      trust.real_person_verified,
      trust.age_18_plus_verified,
      trust.identity_verified,
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
    left join public.marriage_visibility_settings vis
      on vis.user_id = p.user_id
    cross join lateral private.member_visible_trust_badges(p.user_id) trust
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
      and private.marriage_discovery_candidate_visible(v_user_id, p.user_id)
      and private.members_match_hard_constraints(v_user_id, p.user_id)
      and not exists (
        select 1
        from private.controlled_introductions i
        where i.pair_key = case
          when v_user_id::text < p.user_id::text
            then v_user_id::text || ':' || p.user_id::text
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
    case when s.open_profile then s.display_name else null end,
    case when s.open_profile then s.about_me else null end,
    case when s.open_profile then s.occupation else null end,
    case when s.open_profile then s.education else null end,
    s.city,
    case when s.open_profile then s.origin_region else null end,
    s.age_band_id,
    s.age_band_label,
    s.marital_status,
    s.has_children,
    case when s.open_profile then s.approved_photo_id else null end,
    case
      when s.open_profile and s.approved_photo_id is not null then 'full'
      else 'hidden'
    end,
    s.reasons,
    cardinality(s.reasons)::integer,
    s.real_person_verified,
    s.age_18_plus_verified,
    s.identity_verified
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
as $$;
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
     or private.marriage_pair_is_hidden(p_viewer_user_id, p_candidate_user_id)
     or coalesce(
       (
         select vis.visibility_mode
         from public.marriage_visibility_settings vis
         where vis.user_id = p_candidate_user_id
       ),
       'private'::public.marriage_visibility_mode
     ) <> 'standard'::public.marriage_visibility_mode then
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
    'full'::text
  from public.member_profile_photos pp
  where pp.id = p_photo_id
    and pp.user_id = p_candidate_user_id
    and pp.review_state = 'approved'::public.member_photo_review_state
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
