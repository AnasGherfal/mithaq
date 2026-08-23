begin;
select plan(10);

select is(
  has_table_privilege('authenticated', 'private.friendship_connections', 'SELECT'),
  false,
  'members cannot inspect raw friendship connections'
);

select is(
  has_function_privilege('authenticated', 'public.list_my_friendship_connections()', 'EXECUTE'),
  true,
  'authenticated Friends members can list guarded connections'
);

insert into auth.users (
  id, instance_id, aud, role, created_at, updated_at
) values
  ('56565656-5656-4565-8565-565656565651','00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now()),
  ('56565656-5656-4565-8565-565656565652','00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now()),
  ('56565656-5656-4565-8565-565656565653','00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now()),
  ('56565656-5656-4565-8565-565656565654','00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now())
on conflict (id) do nothing;

insert into public.users (id)
values
  ('56565656-5656-4565-8565-565656565651'),
  ('56565656-5656-4565-8565-565656565652'),
  ('56565656-5656-4565-8565-565656565653'),
  ('56565656-5656-4565-8565-565656565654')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub','56565656-5656-4565-8565-565656565651',true);
select public.join_my_connection_space('friendship'::public.connection_space);
select * from public.save_my_friendship_profile(
  'Amina',
  'I enjoy books, coffee, calm walks, and getting to know people through shared local interests and thoughtful conversation.',
  'Tripoli',
  array['Books','Coffee','Walking']
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','56565656-5656-4565-8565-565656565652',true);
select public.join_my_connection_space('friendship'::public.connection_space);
select * from public.save_my_friendship_profile(
  'Mariam',
  'I like cafés, reading, community activities, and friendly conversations with people who enjoy exploring the city.',
  'Tripoli',
  array['Books','Coffee','Community']
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','56565656-5656-4565-8565-565656565653',true);
select public.join_my_connection_space('friendship'::public.connection_space);
select * from public.save_my_friendship_profile(
  'Leen',
  'I enjoy walking, volunteering, food, and relaxed activities with kind people who value respectful friendships.',
  'Benghazi',
  array['Walking','Volunteering','Food']
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','56565656-5656-4565-8565-565656565654',true);
select public.join_my_connection_space('friendship'::public.connection_space);
select * from public.save_my_friendship_profile(
  'Sara',
  'I enjoy local events, coffee, books, and meeting people for low pressure activities and genuine friendship.',
  'Misrata',
  array['Coffee','Books','Events']
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','56565656-5656-4565-8565-565656565651',true);

create temporary table m12_harden_request (id uuid not null) on commit drop;
grant select on m12_harden_request to authenticated;
insert into m12_harden_request
select public.send_friendship_request('56565656-5656-4565-8565-565656565652');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','56565656-5656-4565-8565-565656565652',true);

select is(
  public.respond_to_friendship_request((select id from m12_harden_request), true),
  'accepted'::public.friendship_request_status,
  'accepting a request transitions it to accepted'
);

select is(
  (select count(*)::integer from public.list_my_friendship_connections()),
  1,
  'accepting creates one durable Friends connection'
);

select is(
  (select counterpart_user_id from public.list_my_friendship_connections()),
  '56565656-5656-4565-8565-565656565651'::uuid,
  'the recipient sees only the accepted Friends counterpart'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','56565656-5656-4565-8565-565656565651',true);

select is(
  (select count(*)::integer from public.list_friendship_discovery(6) where user_id='56565656-5656-4565-8565-565656565652'),
  0,
  'an accepted Friends connection never reappears in discovery'
);

create temporary table m12_expiring_request (id uuid not null) on commit drop;
grant select on m12_expiring_request to authenticated;
insert into m12_expiring_request
select public.send_friendship_request('56565656-5656-4565-8565-565656565653');

reset role;
update private.friendship_requests
set expires_at = clock_timestamp() - interval '1 minute'
where id = (select id from m12_expiring_request);

set local role authenticated;
select set_config('request.jwt.claim.sub','56565656-5656-4565-8565-565656565651',true);
select count(*) from public.list_my_friendship_requests();

select is(
  (select status from public.list_my_friendship_requests() where request_id=(select id from m12_expiring_request)),
  'expired'::public.friendship_request_status,
  'expired pending requests are terminalized when Friends request state is read'
);

create temporary table m12_blocked_request (id uuid not null) on commit drop;
grant select on m12_blocked_request to authenticated;
insert into m12_blocked_request
select public.send_friendship_request('56565656-5656-4565-8565-565656565654');

select public.block_member('56565656-5656-4565-8565-565656565654');

select is(
  (select status from public.list_my_friendship_requests() where request_id=(select id from m12_blocked_request)),
  'blocked'::public.friendship_request_status,
  'account-wide blocking terminalizes an outstanding Friends request'
);

select is(
  (select count(*)::integer from public.list_my_friendship_connections() where counterpart_user_id='56565656-5656-4565-8565-565656565654'),
  0,
  'blocked members are never surfaced as Friends connections'
);

select throws_ok(
  $$select public.send_friendship_request('56565656-5656-4565-8565-565656565654')$$,
  'P0001',
  'friendship recipient unavailable',
  'blocking prevents a new Friends request from being created'
);

reset role;
select * from finish();
rollback;
