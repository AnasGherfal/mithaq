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
     or private.marriage_pair_is_hidden(p_viewer_user_id, v_target_user_id)
     or not private.member_can_participate(p_viewer_user_id)
     or not private.member_can_participate(v_target_user_id)
     or not private.introduction_member_photo_is_revealed(
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
