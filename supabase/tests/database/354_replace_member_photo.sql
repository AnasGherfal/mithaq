begin;
select plan(11);

select is(
  has_function_privilege(
    'authenticated',
    'public.replace_member_photo(uuid,text)',
    'EXECUTE'
  ),
  true,
  'authenticated members can use the guarded photo replacement function'
);

select is(
  has_function_privilege(
    'anon',
    'public.replace_member_photo(uuid,text)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot replace member photos'
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
    '54545454-5454-4545-8545-545454545451',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '54545454-5454-4545-8545-545454545452',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('54545454-5454-4545-8545-545454545451'),
  ('54545454-5454-4545-8545-545454545452')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id,
  user_id,
  status,
  submitted_at
) values
  (
    '54545454-aaaa-4aaa-8aaa-545454545451',
    '54545454-5454-4545-8545-545454545451',
    'submitted',
    now()
  ),
  (
    '54545454-bbbb-4bbb-8bbb-545454545452',
    '54545454-5454-4545-8545-545454545452',
    'submitted',
    now()
  );

insert into storage.objects (bucket_id, name)
values
  ('member-profile-photos', '54545454-5454-4545-8545-545454545451/original.jpg'),
  ('member-profile-photos', '54545454-5454-4545-8545-545454545451/replacement.jpg'),
  ('member-profile-photos', '54545454-5454-4545-8545-545454545451/later.jpg'),
  ('member-profile-photos', '54545454-5454-4545-8545-545454545452/other.jpg');

create temporary table m11_replace_photo (
  id uuid primary key
) on commit drop;
grant select on m11_replace_photo to authenticated, service_role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '54545454-5454-4545-8545-545454545451',
  true
);

insert into m11_replace_photo (id)
select public.register_member_photo(
  '54545454-5454-4545-8545-545454545451/original.jpg',
  1::smallint,
  true
);

reset role;
set local role service_role;
select public.review_member_photo(
  (select id from m11_replace_photo),
  'approved'::public.member_photo_review_state,
  null,
  'm11-replace-test'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '54545454-5454-4545-8545-545454545451',
  true
);

select is(
  public.replace_member_photo(
    (select id from m11_replace_photo),
    '54545454-5454-4545-8545-545454545451/replacement.jpg'
  ),
  '54545454-5454-4545-8545-545454545451/original.jpg',
  'replacement returns the old private object path for cleanup'
);

select is(
  (
    select photo_id
    from public.list_my_member_photos()
  ),
  (select id from m11_replace_photo),
  'replacement preserves the stable photo identifier'
);

select is(
  (
    select storage_path
    from public.list_my_member_photos()
  ),
  '54545454-5454-4545-8545-545454545451/replacement.jpg',
  'replacement points metadata at the new owned object'
);

select ok(
  (
    select is_primary and position = 1
    from public.list_my_member_photos()
  ),
  'replacement preserves primary selection and order'
);

select is(
  (
    select review_state::text
    from public.list_my_member_photos()
  ),
  'pending',
  'replacement resets moderation to pending'
);

reset role;
set local role service_role;
select is(
  (
    select count(*)::integer
    from private.member_photo_review_events e
    where e.photo_id = (select id from m11_replace_photo)
      and e.previous_state = 'approved'::public.member_photo_review_state
      and e.new_state = 'pending'::public.member_photo_review_state
      and e.actor_reference = 'member-replacement'
  ),
  1,
  'replacement records a private moderation reset event'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '54545454-5454-4545-8545-545454545451',
  true
);

select throws_ok(
  $$select public.replace_member_photo(
    (select id from m11_replace_photo),
    '54545454-5454-4545-8545-545454545452/other.jpg'
  )$$,
  'P0001',
  'invalid member photo replacement',
  'a member cannot replace a photo with another member folder object'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '54545454-5454-4545-8545-545454545452',
  true
);

select throws_ok(
  $$select public.replace_member_photo(
    (select id from m11_replace_photo),
    '54545454-5454-4545-8545-545454545452/other.jpg'
  )$$,
  'P0001',
  'member photo unavailable',
  'another member cannot replace private photo metadata'
);

reset role;
update public.users
set account_status = 'deletion_pending'
where id = '54545454-5454-4545-8545-545454545451';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '54545454-5454-4545-8545-545454545451',
  true
);

select throws_ok(
  $$select public.replace_member_photo(
    (select id from m11_replace_photo),
    '54545454-5454-4545-8545-545454545451/later.jpg'
  )$$,
  'P0001',
  'account unavailable',
  'inactive accounts cannot replace private photos'
);

reset role;
select * from finish();
rollback;
