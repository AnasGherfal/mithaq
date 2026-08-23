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
  primary_photo_url text
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
    end
  from public.member_profiles p
  join public.waitlist_applications a on a.user_id = p.user_id
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
  to authenticated;
