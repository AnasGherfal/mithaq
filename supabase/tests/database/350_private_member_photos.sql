begin;
select plan(22);

select is(
  (select public from storage.buckets where id = 'member-profile-photos'),
  false,
  'member photo bucket is private'
);

select is(
  has_table_privilege('authenticated', 'public.member_profile_photos', 'SELECT'),
  true,
  'members can read their own photo metadata through RLS'
);

select is(
  has_table_privilege('authenticated', 'public.member_profile_photos', 'INSERT'),
  false,
  'clients cannot insert photo metadata directly'
);

select is(
  has_table_privilege('authenticated', 'public.member_profile_photos', 'UPDATE'),
  false,
  'clients cannot update photo metadata directly'
);

select is(
  has_table_privilege('authenticated', 'public.member_profile_photos', 'DELETE'),
  false,
  'clients cannot delete photo metadata directly'
);

select is(
  has_function_privilege('authenticated', 'public.list_my_member_photos()', 'EXECUTE'),
  true,
  'authenticated members can list their photo metadata'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.register_member_photo(text,smallint,boolean)',
    'EXECUTE'
  ),
  true,
  'authenticated members can register uploaded photos through the guard'
);

select is(
  has_function_privilege(
    'anon',
    'public.register_member_photo(text,smallint,boolean)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot register member photos'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values
  (
    '91919191-9191-4919-8919-919191919191',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '92929292-9292-4929-8929-929292929292',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '93939393-9393-4939-8939-939393939393',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('91919191-9191-4919-8919-919191919191'),
  ('92929292-9292-4929-8929-929292929292'),
  ('93939393-9393-4939-8939-939393939393')
on conflict (id) do nothing;

insert into public.waitlist_applications (id, user_id, status, submitted_at)
values
  (
    'f1919191-9191-4919-8919-919191919191',
    '91919191-9191-4919-8919-919191919191',
    'submitted',
    now()
  ),
  (
    'f2929292-9292-4929-8929-929292929292',
    '92929292-9292-4929-8929-929292929292',
    'submitted',
    now()
  ),
  (
    'f3939393-9393-4939-8939-939393939393',
    '93939393-9393-4939-8939-939393939393',
    'submitted',
    now()
  );

insert into storage.objects (bucket_id, name)
values
  ('member-profile-photos', '91919191-9191-4919-8919-919191919191/photo-a.jpg'),
  ('member-profile-photos', '91919191-9191-4919-8919-919191919191/photo-b.png'),
  ('member-profile-photos', '92929292-9292-4929-8929-929292929292/photo-c.webp'),
  ('member-profile-photos', '93939393-9393-4939-8939-939393939393/photo-d.jpg');

set local role authenticated;
select set_config('request.jwt.claim.sub', '91919191-9191-4919-8919-919191919191', true);

select ok(
  public.register_member_photo(
    '91919191-9191-4919-8919-919191919191/photo-a.jpg',
    1,
    true
  ) is not null,
  'a submitted active member can register an uploaded photo'
);

select is(
  (select count(*)::integer from public.list_my_member_photos()),
  1,
  'the member can list the registered photo'
);

select is(
  (
    select is_primary
    from public.list_my_member_photos()
    where storage_path = '91919191-9191-4919-8919-919191919191/photo-a.jpg'
  ),
  true,
  'the first registered photo becomes primary'
);

select is(
  (
    select review_state::text
    from public.list_my_member_photos()
    where storage_path = '91919191-9191-4919-8919-919191919191/photo-a.jpg'
  ),
  'pending',
  'new photos require review before disclosure'
);

select ok(
  public.register_member_photo(
    '91919191-9191-4919-8919-919191919191/photo-b.png',
    2,
    false
  ) is not null,
  'a member can register a second private photo'
);

select is(
  public.set_primary_member_photo(
    (
      select photo_id
      from public.list_my_member_photos()
      where storage_path = '91919191-9191-4919-8919-919191919191/photo-b.png'
    )
  ),
  true,
  'the member can switch the primary photo'
);

select is(
  (select count(*)::integer from public.list_my_member_photos() where is_primary),
  1,
  'only one photo can be primary'
);

select is(
  public.reorder_member_photos(
    array[
      (
        select photo_id
        from public.list_my_member_photos()
        where storage_path = '91919191-9191-4919-8919-919191919191/photo-b.png'
      ),
      (
        select photo_id
        from public.list_my_member_photos()
        where storage_path = '91919191-9191-4919-8919-919191919191/photo-a.jpg'
      )
    ]
  ),
  true,
  'the member can reorder all owned photos atomically'
);

select is(
  (
    select position::integer
    from public.list_my_member_photos()
    where storage_path = '91919191-9191-4919-8919-919191919191/photo-b.png'
  ),
  1,
  'the requested first photo receives position one'
);

select set_config('request.jwt.claim.sub', '92929292-9292-4929-8929-929292929292', true);

select is(
  (
    select count(*)::integer
    from public.member_profile_photos
    where user_id = '91919191-9191-4919-8919-919191919191'
  ),
  0,
  'another member cannot browse private photo metadata'
);

select throws_ok(
  $$select public.register_member_photo(
    '91919191-9191-4919-8919-919191919191/photo-a.jpg',
    1,
    true
  )$$,
  'P0001',
  'invalid member photo path',
  'a member cannot register an object from another member folder'
);

select set_config('request.jwt.claim.sub', '91919191-9191-4919-8919-919191919191', true);

select is(
  public.remove_member_photo(
    (
      select photo_id
      from public.list_my_member_photos()
      where storage_path = '91919191-9191-4919-8919-919191919191/photo-b.png'
    )
  ),
  '91919191-9191-4919-8919-919191919191/photo-b.png',
  'removing metadata returns the private object path for storage cleanup'
);

select is(
  (
    select is_primary
    from public.list_my_member_photos()
    where storage_path = '91919191-9191-4919-8919-919191919191/photo-a.jpg'
  ),
  true,
  'removing the primary photo promotes the next remaining photo'
);

reset role;
update public.users
set account_status = 'deletion_pending'
where id = '93939393-9393-4939-8939-939393939393';

set local role authenticated;
select set_config('request.jwt.claim.sub', '93939393-9393-4939-8939-939393939393', true);

select throws_ok(
  $$select public.register_member_photo(
    '93939393-9393-4939-8939-939393939393/photo-d.jpg',
    1,
    true
  )$$,
  'P0001',
  'account unavailable',
  'deletion-pending accounts cannot add new private photos'
);

reset role;
select * from finish();
rollback;
