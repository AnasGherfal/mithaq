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
      and pref.photo_privacy_preference =
        'after_mutual_interest'::public.photo_privacy_preference
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
         and pref.photo_privacy_preference =
           'after_mutual_interest'::public.photo_privacy_preference
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

revoke all on function public.resolve_introduction_photo_path_for_service(
  uuid,
  uuid,
  uuid
) from public, anon, authenticated;
grant execute on function public.resolve_introduction_photo_path_for_service(
  uuid,
  uuid,
  uuid
) to service_role;
