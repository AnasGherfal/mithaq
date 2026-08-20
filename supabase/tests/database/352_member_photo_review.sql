begin;
select plan(11);

select is(
  has_function_privilege(
    'service_role',
    'public.review_member_photo(uuid,public.member_photo_review_state,timestamptz,text)',
    'EXECUTE'
  ),
  true,
  'service role can review member photos'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.review_member_photo(uuid,public.member_photo_review_state,timestamptz,text)',
    'EXECUTE'
  ),
  false,
  'members cannot review their own photos'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values (
  '95959595-9595-4959-8959-959595959595',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.users (id)
values ('95959595-9595-4959-8959-959595959595')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id,
  user_id,
  status,
  submitted_at
) values (
  'f5959595-9595-4959-8959-959595959595',
  '95959595-9595-4959-8959-959595959595',
  'submitted',
  now()
);

insert into storage.objects (bucket_id, name)
values (
  'member-profile-photos',
  '95959595-9595-4959-8959-959595959595/review-photo.jpg'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '95959595-9595-4959-8959-959595959595',
  true
);

select ok(
  public.register_member_photo(
    '95959595-9595-4959-8959-959595959595/review-photo.jpg',
    1,
    true
  ) is not null,
  'member can register the private photo before review'
);

select is(
  (
    select review_state::text
    from public.list_my_member_photos()
    limit 1
  ),
  'pending',
  'registered photo begins pending'
);

reset role;
set local role service_role;

select is(
  public.review_member_photo(
    (
      select id
      from public.member_profile_photos
      where user_id = '95959595-9595-4959-8959-959595959595'
    ),
    'approved',
    null,
    'test-moderator'
  ),
  true,
  'service review changes the photo state'
);

select is(
  (
    select review_state::text
    from public.member_profile_photos
    where user_id = '95959595-9595-4959-8959-959595959595'
  ),
  'approved',
  'approved state is stored'
);

select is(
  (
    select count(*)::integer
    from private.member_photo_review_events
    where user_id = '95959595-9595-4959-8959-959595959595'
  ),
  1,
  'review change creates one private audit event'
);

select is(
  public.review_member_photo(
    (
      select id
      from public.member_profile_photos
      where user_id = '95959595-9595-4959-8959-959595959595'
    ),
    'approved',
    null,
    'test-moderator'
  ),
  false,
  'repeating the same review state is idempotent'
);

select is(
  (
    select count(*)::integer
    from private.member_photo_review_events
    where user_id = '95959595-9595-4959-8959-959595959595'
  ),
  1,
  'idempotent retry does not duplicate the audit event'
);

select throws_ok(
  $$select public.review_member_photo(
    (
      select id
      from public.member_profile_photos
      where user_id = '95959595-9595-4959-8959-959595959595'
    ),
    'rejected',
    null,
    ''
  )$$,
  'P0001',
  'invalid member photo review actor',
  'review actor must be explicit'
);

select throws_ok(
  $$select public.review_member_photo(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'approved',
    null,
    'test-moderator'
  )$$,
  'P0001',
  'member photo unavailable',
  'unknown photo cannot be reviewed'
);

reset role;
select * from finish();
rollback;
