create or replace function public.replace_member_photo(
  p_photo_id uuid,
  p_storage_path text
)
returns text
language plpgsql
security definer
set search_path = public, private, storage
as $$
declare
  v_user_id uuid := auth.uid();
  v_storage_path text := nullif(btrim(p_storage_path), '');
  v_photo public.member_profile_photos%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  if not exists (
    select 1
    from public.waitlist_applications a
    where a.user_id = v_user_id
      and a.status in ('submitted', 'qualified', 'invited')
      and a.submitted_at is not null
  ) then
    raise exception 'waitlist submission required';
  end if;

  if p_photo_id is null
     or v_storage_path is null
     or char_length(v_storage_path) > 320
     or v_storage_path not like v_user_id::text || '/%'
     or lower(storage.extension(v_storage_path)) not in ('jpg', 'jpeg', 'png', 'webp') then
    raise exception 'invalid member photo replacement';
  end if;

  select p.*
  into v_photo
  from public.member_profile_photos p
  where p.id = p_photo_id
    and p.user_id = v_user_id
  for update;

  if not found then
    raise exception 'member photo unavailable';
  end if;

  if v_storage_path = v_photo.storage_path
     or exists (
       select 1
       from public.member_profile_photos p
       where p.storage_path = v_storage_path
     )
     or not exists (
       select 1
       from storage.objects o
       where o.bucket_id = 'member-profile-photos'
         and o.name = v_storage_path
     ) then
    raise exception 'invalid member photo replacement';
  end if;

  update public.member_profile_photos
  set storage_path = v_storage_path,
      review_state = 'pending'::public.member_photo_review_state,
      review_after = null,
      updated_at = clock_timestamp()
  where id = v_photo.id
    and user_id = v_user_id;

  insert into private.member_photo_review_events (
    photo_id,
    user_id,
    previous_state,
    new_state,
    actor_reference,
    review_after
  ) values (
    v_photo.id,
    v_user_id,
    v_photo.review_state,
    'pending'::public.member_photo_review_state,
    'member-replacement',
    null
  );

  return v_photo.storage_path;
end;
$$;

revoke all on function public.replace_member_photo(uuid, text)
  from public, anon;
grant execute on function public.replace_member_photo(uuid, text)
  to authenticated, service_role;
