create type public.member_photo_review_state as enum (
  'pending',
  'approved',
  'needs_changes',
  'rejected'
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'member-profile-photos',
  'member-profile-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.member_profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  storage_path text not null unique,
  position smallint not null check (position between 1 and 5),
  is_primary boolean not null default false,
  review_state public.member_photo_review_state not null default 'pending',
  review_after timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint member_profile_photos_user_position_key
    unique (user_id, position)
    deferrable initially deferred,
  check (char_length(storage_path) between 40 and 320),
  check (storage_path like user_id::text || '/%'),
  check (lower(storage.extension(storage_path)) in ('jpg', 'jpeg', 'png', 'webp'))
);

create unique index member_profile_photos_one_primary_idx
  on public.member_profile_photos (user_id)
  where is_primary;

create index member_profile_photos_user_order_idx
  on public.member_profile_photos (user_id, position, created_at);

create index member_profile_photos_review_queue_idx
  on public.member_profile_photos (review_state, created_at)
  where review_state in ('pending', 'needs_changes');

alter table public.member_profile_photos enable row level security;

create policy "member photos read own"
on public.member_profile_photos
for select
to authenticated
using (user_id = auth.uid());

revoke all on table public.member_profile_photos from public, anon;
revoke insert, update, delete on table public.member_profile_photos from authenticated;
grant select on table public.member_profile_photos to authenticated;
grant select, insert, update, delete on table public.member_profile_photos to service_role;

create policy "member photo objects upload own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "member photo objects read own folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "member photo objects delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.list_my_member_photos()
returns table (
  photo_id uuid,
  storage_path text,
  "position" smallint,
  is_primary boolean,
  review_state public.member_photo_review_state,
  review_after timestamptz,
  created_at timestamptz
)
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

  return query
  select
    p.id,
    p.storage_path,
    p.position,
    p.is_primary,
    p.review_state,
    p.review_after,
    p.created_at
  from public.member_profile_photos p
  where p.user_id = v_user_id
  order by p.position, p.created_at, p.id;
end;
$$;

create or replace function public.register_member_photo(
  p_storage_path text,
  p_position smallint default null,
  p_make_primary boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_user_id uuid := auth.uid();
  v_storage_path text := nullif(btrim(p_storage_path), '');
  v_position smallint;
  v_photo_id uuid;
  v_make_primary boolean;
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

  if v_storage_path is null
     or char_length(v_storage_path) > 320
     or v_storage_path not like v_user_id::text || '/%'
     or lower(storage.extension(v_storage_path)) not in ('jpg', 'jpeg', 'png', 'webp') then
    raise exception 'invalid member photo path';
  end if;

  select p.id
  into v_photo_id
  from public.member_profile_photos p
  where p.user_id = v_user_id
    and p.storage_path = v_storage_path;

  if v_photo_id is not null then
    return v_photo_id;
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'member-profile-photos'
      and o.name = v_storage_path
  ) then
    raise exception 'member photo object not found';
  end if;

  if (
    select count(*)
    from public.member_profile_photos p
    where p.user_id = v_user_id
  ) >= 5 then
    raise exception 'member photo limit reached';
  end if;

  if p_position is not null then
    if p_position not between 1 and 5 then
      raise exception 'invalid member photo position';
    end if;

    if exists (
      select 1
      from public.member_profile_photos p
      where p.user_id = v_user_id
        and p.position = p_position
    ) then
      raise exception 'member photo position already used';
    end if;

    v_position := p_position;
  else
    select s::smallint
    into v_position
    from generate_series(1, 5) s
    where not exists (
      select 1
      from public.member_profile_photos p
      where p.user_id = v_user_id
        and p.position = s
    )
    order by s
    limit 1;
  end if;

  if v_position is null then
    raise exception 'member photo limit reached';
  end if;

  v_make_primary := coalesce(p_make_primary, false) or not exists (
    select 1
    from public.member_profile_photos p
    where p.user_id = v_user_id
  );

  if v_make_primary then
    update public.member_profile_photos
    set is_primary = false,
        updated_at = clock_timestamp()
    where user_id = v_user_id
      and is_primary;
  end if;

  insert into public.member_profile_photos (
    user_id,
    storage_path,
    position,
    is_primary
  ) values (
    v_user_id,
    v_storage_path,
    v_position,
    v_make_primary
  )
  returning id into v_photo_id;

  return v_photo_id;
end;
$$;

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

create or replace function public.remove_member_photo(
  p_photo_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_storage_path text;
  v_was_primary boolean;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  delete from public.member_profile_photos p
  where p.id = p_photo_id
    and p.user_id = v_user_id
  returning p.storage_path, p.is_primary
  into v_storage_path, v_was_primary;

  if v_storage_path is null then
    raise exception 'member photo unavailable';
  end if;

  if v_was_primary then
    update public.member_profile_photos
    set is_primary = true,
        updated_at = clock_timestamp()
    where id = (
      select p.id
      from public.member_profile_photos p
      where p.user_id = v_user_id
      order by p.position, p.created_at, p.id
      limit 1
    );
  end if;

  return v_storage_path;
end;
$$;

revoke all on function public.list_my_member_photos() from public, anon;
revoke all on function public.register_member_photo(text, smallint, boolean) from public, anon;
revoke all on function public.set_primary_member_photo(uuid) from public, anon;
revoke all on function public.reorder_member_photos(uuid[]) from public, anon;
revoke all on function public.remove_member_photo(uuid) from public, anon;

grant execute on function public.list_my_member_photos() to authenticated, service_role;
grant execute on function public.register_member_photo(text, smallint, boolean) to authenticated, service_role;
grant execute on function public.set_primary_member_photo(uuid) to authenticated, service_role;
grant execute on function public.reorder_member_photos(uuid[]) to authenticated, service_role;
grant execute on function public.remove_member_photo(uuid) to authenticated, service_role;
