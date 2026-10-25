create or replace function private.marriage_discovery_photo_object_visible(
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
    left join public.marriage_visibility_settings vis on vis.user_id = photo.user_id
    where photo.storage_path = p_storage_path
      and photo.review_state = 'approved'::public.member_photo_review_state
      and photo.id = (
        select preferred.id
        from public.member_profile_photos preferred
        where preferred.user_id = photo.user_id
          and preferred.review_state = 'approved'::public.member_photo_review_state
        order by preferred.is_primary desc, preferred.position, preferred.created_at, preferred.id
        limit 1
      )
      and p_viewer_user_id is not null
      and photo.user_id <> p_viewer_user_id
      and private.marriage_member_is_discoverable(p_viewer_user_id)
      and private.marriage_member_is_discoverable(photo.user_id)
      and private.members_match_hard_constraints(p_viewer_user_id, photo.user_id)
      and private.marriage_discovery_candidate_visible(p_viewer_user_id, photo.user_id)
      and coalesce(vis.visibility_mode, 'private'::public.marriage_visibility_mode) = 'standard'::public.marriage_visibility_mode
      and not exists (
        select 1
        from private.controlled_introductions i
        where i.pair_key = case
          when p_viewer_user_id::text < photo.user_id::text then p_viewer_user_id::text || ':' || photo.user_id::text
          else photo.user_id::text || ':' || p_viewer_user_id::text
        end
          and i.status in ('offered', 'mutually_accepted')
      )
      and not exists (
        select 1
        from private.marriage_discovery_actions d
        where d.actor_user_id = p_viewer_user_id
          and d.candidate_user_id = photo.user_id
          and (d.action = 'noticed'::public.marriage_discovery_action
               or d.created_at >= clock_timestamp() - interval '14 days')
      )
  );
$$;

revoke all on function private.marriage_discovery_photo_object_visible(uuid, text) from public, anon, authenticated;

create or replace function public.get_my_marriage_discovery_photo_path(
  p_candidate_user_id uuid,
  p_photo_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = 'public', 'private'
as $$
declare
  v_user_id uuid := auth.uid();
  v_storage_path text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select photo.storage_path
  into v_storage_path
  from public.member_profile_photos photo
  where photo.id = p_photo_id
    and photo.user_id = p_candidate_user_id;

  if v_storage_path is null
     or not private.marriage_discovery_photo_object_visible(v_user_id, v_storage_path) then
    raise exception 'marriage discovery photo unavailable';
  end if;

  return v_storage_path;
end;
$$;

revoke all on function public.get_my_marriage_discovery_photo_path(uuid, uuid) from public;
revoke execute on function public.get_my_marriage_discovery_photo_path(uuid, uuid) from anon;
grant execute on function public.get_my_marriage_discovery_photo_path(uuid, uuid) to authenticated;

drop policy if exists "member photo objects read marriage discovery" on storage.objects;
create policy "member photo objects read marriage discovery"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-profile-photos'
  and private.marriage_discovery_photo_object_visible(auth.uid(), name)
);
