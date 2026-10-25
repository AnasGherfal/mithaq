create or replace function private.is_stage_c_photo_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_invited_marriage_user(p_user_id)
    and exists (
      select 1
      from public.member_profiles p
      where p.user_id = p_user_id
        and p.profile_completed_at is not null
    )
    and exists (
      select 1
      from public.member_connection_spaces s
      where s.user_id = p_user_id
        and s.space = 'marriage'::public.connection_space
        and s.membership_state = 'active'::public.connection_space_membership_state
    );
$$;

revoke all on function private.is_stage_c_photo_user(uuid) from public, anon, authenticated;

drop policy if exists "member photo objects upload own folder" on storage.objects;
create policy "member photo objects upload own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) = any (array['jpg'::text, 'jpeg'::text, 'png'::text, 'webp'::text])
  and exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.account_status = 'active'::public.account_status
  )
  and exists (
    select 1 from public.waitlist_applications a
    where a.user_id = auth.uid()
      and a.status = 'invited'::public.waitlist_status
      and a.submitted_at is not null
      and a.questionnaire_completed_at is not null
  )
  and exists (
    select 1 from public.member_profiles p
    where p.user_id = auth.uid()
      and p.profile_completed_at is not null
  )
  and exists (
    select 1 from public.member_connection_spaces s
    where s.user_id = auth.uid()
      and s.space = 'marriage'::public.connection_space
      and s.membership_state = 'active'::public.connection_space_membership_state
  )
);

create or replace function public.register_member_photo(
  p_storage_path text,
  p_position smallint default null,
  p_make_primary boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'storage'
as $$
declare
  v_user_id uuid := auth.uid();
  v_storage_path text := nullif(btrim(p_storage_path), '');
  v_position smallint;
  v_photo_id uuid;
  v_make_primary boolean;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.account_status = 'active'
  ) then raise exception 'account unavailable'; end if;
  if not private.is_stage_c_photo_user(v_user_id) then raise exception 'photo onboarding unavailable'; end if;

  if v_storage_path is null
     or char_length(v_storage_path) > 320
     or v_storage_path not like v_user_id::text || '/%'
     or lower(storage.extension(v_storage_path)) not in ('jpg', 'jpeg', 'png', 'webp') then
    raise exception 'invalid member photo path';
  end if;

  select p.id into v_photo_id
  from public.member_profile_photos p
  where p.user_id = v_user_id and p.storage_path = v_storage_path;
  if v_photo_id is not null then return v_photo_id; end if;

  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'member-profile-photos' and o.name = v_storage_path
  ) then raise exception 'member photo object not found'; end if;

  if (select count(*) from public.member_profile_photos p where p.user_id = v_user_id) >= 5 then
    raise exception 'member photo limit reached';
  end if;

  if p_position is not null then
    if p_position not between 1 and 5 then raise exception 'invalid member photo position'; end if;
    if exists (
      select 1 from public.member_profile_photos p
      where p.user_id = v_user_id and p.position = p_position
    ) then raise exception 'member photo position already used'; end if;
    v_position := p_position;
  else
    select s::smallint into v_position
    from generate_series(1, 5) s
    where not exists (
      select 1 from public.member_profile_photos p
      where p.user_id = v_user_id and p.position = s
    )
    order by s limit 1;
  end if;

  if v_position is null then raise exception 'member photo limit reached'; end if;

  v_make_primary := coalesce(p_make_primary, false) or not exists (
    select 1 from public.member_profile_photos p where p.user_id = v_user_id
  );

  if v_make_primary then
    update public.member_profile_photos
    set is_primary = false, updated_at = clock_timestamp()
    where user_id = v_user_id and is_primary;
  end if;

  insert into public.member_profile_photos (user_id, storage_path, position, is_primary)
  values (v_user_id, v_storage_path, v_position, v_make_primary)
  returning id into v_photo_id;

  return v_photo_id;
end;
$$;

create or replace function public.replace_member_photo(p_photo_id uuid, p_storage_path text)
returns text
language plpgsql
security definer
set search_path = 'public', 'private', 'storage'
as $$
declare
  v_user_id uuid := auth.uid();
  v_storage_path text := nullif(btrim(p_storage_path), '');
  v_photo public.member_profile_photos%rowtype;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.account_status = 'active'
  ) then raise exception 'account unavailable'; end if;
  if not private.is_stage_c_photo_user(v_user_id) then raise exception 'photo onboarding unavailable'; end if;

  if p_photo_id is null
     or v_storage_path is null
     or char_length(v_storage_path) > 320
     or v_storage_path not like v_user_id::text || '/%'
     or lower(storage.extension(v_storage_path)) not in ('jpg', 'jpeg', 'png', 'webp') then
    raise exception 'invalid member photo replacement';
  end if;

  select p.* into v_photo
  from public.member_profile_photos p
  where p.id = p_photo_id and p.user_id = v_user_id
  for update;
  if not found then raise exception 'member photo unavailable'; end if;

  if v_storage_path = v_photo.storage_path
     or exists (select 1 from public.member_profile_photos p where p.storage_path = v_storage_path)
     or not exists (
       select 1 from storage.objects o
       where o.bucket_id = 'member-profile-photos' and o.name = v_storage_path
     ) then raise exception 'invalid member photo replacement'; end if;

  update public.member_profile_photos
  set storage_path = v_storage_path,
      review_state = 'pending'::public.member_photo_review_state,
      review_after = null,
      updated_at = clock_timestamp()
  where id = v_photo.id and user_id = v_user_id;

  insert into private.member_photo_review_events (
    photo_id, user_id, previous_state, new_state, actor_reference, review_after
  ) values (
    v_photo.id, v_user_id, v_photo.review_state,
    'pending'::public.member_photo_review_state, 'member-replacement', null
  );

  return v_photo.storage_path;
end;
$$;
