drop policy if exists "member photo objects upload own folder" on storage.objects;

create policy "member photo objects upload own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.account_status = 'active'
  )
  and exists (
    select 1
    from public.waitlist_applications a
    where a.user_id = auth.uid()
      and a.status in ('submitted', 'qualified', 'invited')
      and a.submitted_at is not null
  )
);

create or replace function public.set_primary_member_photo(
  p_photo_id uuid
)
returns boolean
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
    from public.member_profile_photos p
    where p.id = p_photo_id
      and p.user_id = v_user_id
  ) then
    raise exception 'member photo unavailable';
  end if;

  update public.member_profile_photos
  set is_primary = false,
      updated_at = clock_timestamp()
  where user_id = v_user_id
    and is_primary;

  update public.member_profile_photos
  set is_primary = true,
      updated_at = clock_timestamp()
  where id = p_photo_id
    and user_id = v_user_id;

  return true;
end;
$$;

create or replace function public.reorder_member_photos(
  p_photo_ids uuid[]
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_photo_count integer;
  v_requested_count integer := coalesce(cardinality(p_photo_ids), 0);
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

  select count(*)::integer
  into v_photo_count
  from public.member_profile_photos p
  where p.user_id = v_user_id;

  if v_requested_count <> v_photo_count
     or v_requested_count > 5
     or exists (
       select 1
       from unnest(p_photo_ids) id
       group by id
       having id is null or count(*) > 1
     )
     or exists (
       select 1
       from unnest(p_photo_ids) id
       where not exists (
         select 1
         from public.member_profile_photos p
         where p.id = id
           and p.user_id = v_user_id
       )
     ) then
    raise exception 'invalid member photo order';
  end if;

  update public.member_profile_photos p
  set position = array_position(p_photo_ids, p.id)::smallint,
      updated_at = clock_timestamp()
  where p.user_id = v_user_id;

  return true;
end;
$$;
