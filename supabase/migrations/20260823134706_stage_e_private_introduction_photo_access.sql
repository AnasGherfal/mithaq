create or replace function private.introduction_photo_object_visible(
  p_viewer_user_id uuid,
  p_storage_path text
)
returns boolean
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select exists (
    select 1
    from public.member_profile_photos photo
    join private.controlled_introductions i
      on (
        (i.user_a_id = p_viewer_user_id and i.user_b_id = photo.user_id)
        or
        (i.user_b_id = p_viewer_user_id and i.user_a_id = photo.user_id)
      )
    where photo.storage_path = p_storage_path
      and photo.review_state = 'approved'::public.member_photo_review_state
      and p_viewer_user_id is not null
      and i.status in ('offered', 'mutually_accepted')
      and i.expires_at > clock_timestamp()
      and not private.members_are_blocked(p_viewer_user_id, photo.user_id)
      and not private.marriage_pair_is_hidden(p_viewer_user_id, photo.user_id)
      and private.member_can_participate(p_viewer_user_id)
      and private.member_can_participate(photo.user_id)
      and private.introduction_member_photo_is_visible(i.id, photo.user_id)
  );
$$;

revoke all on function private.introduction_photo_object_visible(uuid, text) from public, anon, authenticated;

create or replace function public.get_my_introduction_photo_path(
  p_introduction_id uuid,
  p_photo_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_storage_path text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  v_storage_path := public.resolve_introduction_photo_path_for_service(
    v_user_id,
    p_introduction_id,
    p_photo_id
  );

  return v_storage_path;
end;
$$;

revoke all on function public.get_my_introduction_photo_path(uuid, uuid) from public;
revoke execute on function public.get_my_introduction_photo_path(uuid, uuid) from anon;
grant execute on function public.get_my_introduction_photo_path(uuid, uuid) to authenticated;

drop policy if exists "member photo objects read introduction" on storage.objects;
create policy "member photo objects read introduction"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-profile-photos'
  and private.introduction_photo_object_visible(auth.uid(), name)
);
