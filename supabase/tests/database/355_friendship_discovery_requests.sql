begin;
select plan(19);

select is(
  has_table_privilege('authenticated', 'private.friendship_requests', 'SELECT'),
  false,
  'members cannot inspect raw friendship requests'
);

select is(
  has_function_privilege('authenticated', 'public.list_friendship_discovery(integer)', 'EXECUTE'),
  true,
  'authenticated friendship members can use guarded discovery'
);

select is(
  has_function_privilege('authenticated', 'public.send_friendship_request(uuid)', 'EXECUTE'),
  true,
  'authenticated friendship members can send guarded requests'
);

select is(
  has_function_privilege('anon', 'public.list_friendship_discovery(integer)', 'EXECUTE'),
  false,
  'anonymous users cannot browse Friends discovery'
);

insert into auth.users (
  id, instance_id, aud, role, created_at, updated_at
) values
  ('55555555-5555-4555-8555-555555555551','00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now()),
  ('55555555-5555-4555-8555-555555555552','00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now()),
  ('55555555-5555-4555-8555-555555555553','00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now())
on conflict (id) do nothing;

insert into public.users (id)
values
  ('55555555-5555-4555-8555-555555555551'),
  ('55555555-5555-4555-8555-555555555552'),
  ('55555555-5555-4555-8555-555555555553')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555551',true);
select public.join_my_connection_space('friendship'::public.connection_space);
select * from public.save_my_friendship_profile(
  'Nour',
  'I enjoy coffee, books, walking around the city, and meeting kind people through relaxed conversations.',
  'Tripoli',
  array['Coffee','Books','Walking']
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555552',true);
select public.join_my_connection_space('friendship'::public.connection_space);
select * from public.save_my_friendship_profile(
  'Salma',
  'I like discovering cafés, reading, local activities, and getting to know people slowly around shared interests.',
  'Tripoli',
  array['Coffee','Books','Travel']
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555553',true);
select public.join_my_connection_space('friendship'::public.connection_space);
select * from public.save_my_friendship_profile(
  'Huda',
  'I enjoy outdoor walks, volunteering, food experiences, and meeting friendly people for simple local activities.',
  'Benghazi',
  array['Walking','Volunteering','Food']
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555551',true);

select is(
  (select count(*)::integer from public.list_friendship_discovery(6)),
  2,
  'Friends discovery lists only other eligible friendship profiles'
);

select is(
  (select user_id from public.list_friendship_discovery(6) limit 1),
  '55555555-5555-4555-8555-555555555552'::uuid,
  'the candidate with more shared interests ranks first'
);

select is(
  (select shared_interest_count from public.list_friendship_discovery(6) where user_id='55555555-5555-4555-8555-555555555552'),
  2,
  'shared-interest evidence is factual and computed from Friends interests'
);

select throws_ok(
  $$select public.send_friendship_request('55555555-5555-4555-8555-555555555551')$$,
  'P0001',
  'friendship recipient unavailable',
  'a member cannot send a friendship request to themselves'
);

create temporary table m12_friend_request (id uuid not null) on commit drop;
grant select on m12_friend_request to authenticated;
insert into m12_friend_request
select public.send_friendship_request('55555555-5555-4555-8555-555555555552');

select is(
  (select count(*)::integer from public.list_friendship_discovery(6) where user_id='55555555-5555-4555-8555-555555555552'),
  0,
  'a pending request removes that person from discovery'
);

select is(
  (select status from public.list_my_friendship_requests() where request_id=(select id from m12_friend_request)),
  'pending'::public.friendship_request_status,
  'the sender can see their own pending request through the guarded list'
);

select is(
  (select direction from public.list_my_friendship_requests() where request_id=(select id from m12_friend_request)),
  'outgoing',
  'the sender sees the request as outgoing'
);

select throws_ok(
  $$select public.send_friendship_request('55555555-5555-4555-8555-555555555552')$$,
  'P0001',
  'friendship request unavailable',
  'duplicate active friendship requests are rejected'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555552',true);

select is(
  (select direction from public.list_my_friendship_requests() where request_id=(select id from m12_friend_request)),
  'incoming',
  'the recipient sees the request as incoming'
);

select is(
  public.respond_to_friendship_request((select id from m12_friend_request), true),
  'accepted'::public.friendship_request_status,
  'the recipient can accept a friendship request'
);

select is(
  (select status from public.list_my_friendship_requests() where request_id=(select id from m12_friend_request)),
  'accepted'::public.friendship_request_status,
  'accepted friendship state is visible through the guarded list'
);

select throws_ok(
  $$select public.respond_to_friendship_request((select id from m12_friend_request), true)$$,
  'P0001',
  'friendship request unavailable',
  'an accepted request cannot be accepted twice'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555553',true);
select public.block_member('55555555-5555-4555-8555-555555555551');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555551',true);

select is(
  (select count(*)::integer from public.list_friendship_discovery(6) where user_id='55555555-5555-4555-8555-555555555553'),
  0,
  'account-wide blocking removes a person from Friends discovery'
);

select throws_ok(
  $$select public.send_friendship_request('55555555-5555-4555-8555-555555555553')$$,
  'P0001',
  'friendship recipient unavailable',
  'a blocked pair cannot create a friendship request'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555553',true);

select throws_ok(
  $$select public.withdraw_friendship_request(gen_random_uuid())$$,
  'P0001',
  'friendship request unavailable',
  'a member cannot withdraw a request they do not own'
);

reset role;
select * from finish();
rollback;
