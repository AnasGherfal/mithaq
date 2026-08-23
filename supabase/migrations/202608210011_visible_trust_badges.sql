create or replace function private.member_visible_trust_badges(
  p_user_id uuid
)
returns table (
  real_person_verified boolean,
  age_18_plus_verified boolean,
  identity_verified boolean
)
language sql
stable
security definer
set search_path = private
as $$
  select
    coalesce((
      select t.verification_level in (
        'selfie_verified'::private.identity_verification_level,
        'id_verified'::private.identity_verification_level
      )
      from private.member_identity_trust t
      where t.user_id = p_user_id
    ), false),
    coalesce((
      select t.age_18_plus_verified
      from private.member_identity_trust t
      where t.user_id = p_user_id
    ), false),
    coalesce((
      select t.verification_level = 'id_verified'::private.identity_verification_level
      from private.member_identity_trust t
      where t.user_id = p_user_id
    ), false);
$$;

revoke all on function private.member_visible_trust_badges(uuid)
  from public, anon, authenticated;
grant execute on function private.member_visible_trust_badges(uuid)
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
      a.current_city as city,
      a.age_band_id,
      age.label as age_band_label,
      a.marital_status,
      a.has_children,
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
    join public.waitlist_applications a on a.user_id = p.user_id
    join public.age_bands age on age.id = a.age_band_id
    cross join lateral private.member_visible_trust_badges(p.user_id) trust
    where p.user_id <> v_user_id
      and private.marriage_member_is_discoverable(p.user_id)
      and private.marriage_discovery_candidate_visible(v_user_id, p.user_id)
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
    null::text,
    null::text,
    null::text,
    null::text,
    s.city,
    null::text,
    s.age_band_id,
    s.age_band_label,
    s.marital_status,
    s.has_children,
    null::uuid,
    'hidden'::text,
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
  country_code char(2),
  city text,
  origin_region text,
  marital_status public.marital_status,
  has_children boolean,
  primary_photo_url text,
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
     or (v_status = 'offered' and v_expires_at <= clock_timestamp())
     or private.members_are_blocked(v_user_id, v_target_user_id)
     or private.marriage_pair_is_hidden(v_user_id, v_target_user_id)
     or not private.member_can_participate(v_user_id)
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
    a.has_children,
    case
      when v_status = 'mutually_accepted'::public.introduction_status then (
        select
          'mithaq-introduction-photo://' ||
          p_introduction_id::text ||
          '/' ||
          photo.photo_id::text
        from public.list_introduction_photo_refs(p_introduction_id) photo
        order by photo.is_primary desc, photo.position, photo.photo_id
        limit 1
      )
      else null
    end,
    trust.real_person_verified,
    trust.age_18_plus_verified,
    trust.identity_verified
  from public.member_profiles p
  join public.waitlist_applications a on a.user_id = p.user_id
  cross join lateral private.member_visible_trust_badges(p.user_id) trust
  where p.user_id = v_target_user_id
    and p.profile_completed_at is not null
    and a.status in ('submitted', 'qualified', 'invited')
    and a.submitted_at is not null
    and a.questionnaire_completed_at is not null;
end;
$$;

revoke all on function public.get_introduction_preview(uuid)
  from public, anon;
grant execute on function public.get_introduction_preview(uuid)
  to authenticated, service_role;
