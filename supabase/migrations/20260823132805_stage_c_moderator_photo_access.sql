create or replace function private.can_review_member_media()
returns boolean
language sql
stable
security definer
set search_path = 'private'
as $$
  select private.moderation_role_can_review(private.current_moderation_role());
$$;

revoke all on function private.can_review_member_media() from public, anon;
grant execute on function private.can_review_member_media() to authenticated;

drop policy if exists "member photo objects read moderators" on storage.objects;
create policy "member photo objects read moderators"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-profile-photos'
  and private.can_review_member_media()
);

create or replace function public.get_moderation_photo_storage_path(p_photo_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = 'public', 'private'
as $$
declare
  v_role text := private.current_moderation_role();
  v_path text;
begin
  if not private.moderation_role_can_review(v_role) then
    raise exception 'moderation access required';
  end if;

  if p_photo_id is null then
    raise exception 'photo required';
  end if;

  select p.storage_path
  into v_path
  from public.member_profile_photos p
  where p.id = p_photo_id;

  if v_path is null then
    raise exception 'photo unavailable';
  end if;

  return v_path;
end;
$$;

revoke all on function public.get_moderation_photo_storage_path(uuid) from public;
revoke execute on function public.get_moderation_photo_storage_path(uuid) from anon;
grant execute on function public.get_moderation_photo_storage_path(uuid) to authenticated;
