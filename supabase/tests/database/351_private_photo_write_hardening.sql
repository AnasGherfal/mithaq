begin;
select plan(3);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values (
  '94949494-9494-4949-8949-949494949494',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.users (id)
values ('94949494-9494-4949-8949-949494949494')
on conflict (id) do nothing;

insert into public.waitlist_applications (id, user_id, status, submitted_at)
values (
  'f4949494-9494-4949-8949-949494949494',
  '94949494-9494-4949-8949-949494949494',
  'submitted',
  now()
);

insert into storage.objects (bucket_id, name)
values (
  'member-profile-photos',
  '94949494-9494-4949-8949-949494949494/photo-a.jpg'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '94949494-9494-4949-8949-949494949494', true);

select public.register_member_photo(
  '94949494-9494-4949-8949-949494949494/photo-a.jpg',
  1,
  true
);

reset role;
update public.users
set account_status = 'deletion_pending'
where id = '94949494-9494-4949-8949-949494949494';

set local role authenticated;
select set_config('request.jwt.claim.sub', '94949494-9494-4949-8949-949494949494', true);

select throws_ok(
  $$select public.set_primary_member_photo(
    (
      select photo_id
      from public.list_my_member_photos()
      limit 1
    )
  )$$,
  'P0001',
  'account unavailable',
  'inactive accounts cannot change the primary photo'
);

select throws_ok(
  $$select public.reorder_member_photos(
    array[
      (
        select photo_id
        from public.list_my_member_photos()
        limit 1
      )
    ]
  )$$,
  'P0001',
  'account unavailable',
  'inactive accounts cannot reorder photos'
);

select is(
  public.remove_member_photo(
    (
      select photo_id
      from public.list_my_member_photos()
      limit 1
    )
  ),
  '94949494-9494-4949-8949-949494949494/photo-a.jpg',
  'inactive members can still remove private photo metadata for cleanup'
);

reset role;
select * from finish();
rollback;
