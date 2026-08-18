begin;
select plan(15);

select is(
  has_function_privilege(
    'authenticated',
    'public.send_conversation_message_idempotent(uuid, text, text)',
    'EXECUTE'
  ),
  true,
  'authenticated members can use the idempotent message RPC'
);
select is(
  has_function_privilege(
    'anon',
    'public.send_conversation_message_idempotent(uuid, text, text)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot use the idempotent message RPC'
);
select is(
  has_table_privilege('authenticated', 'private.conversation_messages', 'INSERT'),
  false,
  'members still cannot bypass the guarded RPC with direct message inserts'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('24242424-2424-4424-8424-242424242421', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('24242424-2424-4424-8424-242424242422', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('24242424-2424-4424-8424-242424242423', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('24242424-2424-4424-8424-242424242421'),
  ('24242424-2424-4424-8424-242424242422'),
  ('24242424-2424-4424-8424-242424242423')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id, user_id, status, gender, age_band_id, residency_type,
  current_country_code, current_city, marital_status, has_children,
  questionnaire_completed_at, submitted_at
) values
  ('24242424-aaaa-4aaa-8aaa-242424242421', '24242424-2424-4424-8424-242424242421', 'submitted', 'man', 2, 'libya', 'LY', 'Tripoli', 'never_married', false, now(), now() - interval '3 days'),
  ('24242424-bbbb-4bbb-8bbb-242424242422', '24242424-2424-4424-8424-242424242422', 'submitted', 'woman', 2, 'libya', 'LY', 'Benghazi', 'never_married', false, now(), now() - interval '2 days'),
  ('24242424-cccc-4ccc-8ccc-242424242423', '24242424-2424-4424-8424-242424242423', 'submitted', 'man', 3, 'libya', 'LY', 'Misrata', 'never_married', false, now(), now() - interval '1 day');

insert into public.waitlist_preferences (
  application_id, open_to_libya, open_to_diaspora,
  preferred_partner_age_min, preferred_partner_age_max,
  accepts_partner_with_children
) values
  ('24242424-aaaa-4aaa-8aaa-242424242421', true, true, 18, 60, 'depends'),
  ('24242424-bbbb-4bbb-8bbb-242424242422', true, true, 18, 60, 'depends'),
  ('24242424-cccc-4ccc-8ccc-242424242423', true, true, 18, 60, 'depends');

insert into public.member_profiles (user_id, display_name, about_me, profile_completed_at) values
  ('24242424-2424-4424-8424-242424242421', 'Omar', 'A complete serious profile for idempotent private message testing.', now()),
  ('24242424-2424-4424-8424-242424242422', 'Sara', 'A complete serious profile for idempotent private message testing.', now()),
  ('24242424-2424-4424-8424-242424242423', 'Yousef', 'A complete serious non-participant profile for access testing.', now());

create temporary table m9_ids (
  name text primary key,
  id uuid not null
) on commit drop;
grant select, insert on m9_ids to authenticated, service_role;

set local role service_role;
select public.set_member_profile_review_state('24242424-2424-4424-8424-242424242421', 'approved', 'm9', 'idempotency-test', null);
select public.set_member_profile_review_state('24242424-2424-4424-8424-242424242422', 'approved', 'm9', 'idempotency-test', null);
select public.set_member_profile_review_state('24242424-2424-4424-8424-242424242423', 'approved', 'm9', 'idempotency-test', null);

insert into m9_ids (name, id)
select 'intro', public.create_controlled_introduction(
  '24242424-2424-4424-8424-242424242421',
  '24242424-2424-4424-8424-242424242422',
  clock_timestamp() + interval '7 days',
  'idempotency-test'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '24242424-2424-4424-8424-242424242421', true);
select public.respond_to_introduction((select id from m9_ids where name = 'intro'), true);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '24242424-2424-4424-8424-242424242422', true);
select public.respond_to_introduction((select id from m9_ids where name = 'intro'), true);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '24242424-2424-4424-8424-242424242421', true);

insert into m9_ids (name, id)
select 'first_message', public.send_conversation_message_idempotent(
  (select id from m9_ids where name = 'intro'),
  'Assalamu alaikum. This send may be retried safely.',
  'retry-safe-client-nonce-0001'
);

select ok(
  (select id from m9_ids where name = 'first_message') is not null,
  'first idempotent send returns a message id'
);
select is(
  public.send_conversation_message_idempotent(
    (select id from m9_ids where name = 'intro'),
    'Assalamu alaikum. This send may be retried safely.',
    'retry-safe-client-nonce-0001'
  ),
  (select id from m9_ids where name = 'first_message'),
  'retrying the same body and nonce returns the original message id'
);

reset role;
set local role service_role;
select is(
  (
    select count(*)::integer
    from private.conversation_messages
    where sender_user_id = '24242424-2424-4424-8424-242424242421'
      and client_nonce = 'retry-safe-client-nonce-0001'
  ),
  1,
  'same-nonce retry creates only one message row'
);
select is(
  (
    select count(*)::integer
    from private.member_notifications
    where user_id = '24242424-2424-4424-8424-242424242422'
      and kind = 'message_received'
  ),
  1,
  'same-nonce retry creates only one recipient notification'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '24242424-2424-4424-8424-242424242421', true);
select throws_ok(
  $$select public.send_conversation_message_idempotent(
    (select id from m9_ids where name = 'intro'),
    'A different body must not reuse the same nonce.',
    'retry-safe-client-nonce-0001'
  )$$,
  'P0001',
  'message idempotency conflict',
  'reusing a nonce with a different body is rejected'
);
select throws_ok(
  $$select public.send_conversation_message_idempotent(
    (select id from m9_ids where name = 'intro'),
    'Invalid nonce should fail.',
    'short'
  )$$,
  'P0001',
  'invalid message nonce',
  'short or malformed client nonces are rejected'
);

insert into m9_ids (name, id)
select 'second_message', public.send_conversation_message_idempotent(
  (select id from m9_ids where name = 'intro'),
  'A genuinely new message uses a new nonce.',
  'retry-safe-client-nonce-0002'
);
select isnt(
  (select id from m9_ids where name = 'second_message'),
  (select id from m9_ids where name = 'first_message'),
  'a new nonce creates a distinct message'
);

reset role;
set local role service_role;
select is(
  (
    select count(*)::integer
    from private.conversation_messages
    where conversation_id = (
      select c.id
      from private.introduction_conversations c
      where c.introduction_id = (select id from m9_ids where name = 'intro')
    )
  ),
  2,
  'two distinct nonces create two messages'
);
select is(
  (
    select count(*)::integer
    from private.member_notifications
    where user_id = '24242424-2424-4424-8424-242424242422'
      and kind = 'message_received'
  ),
  2,
  'each genuinely new message creates one recipient notification'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '24242424-2424-4424-8424-242424242422', true);
select ok(
  public.send_conversation_message_idempotent(
    (select id from m9_ids where name = 'intro'),
    'The other sender may independently use the same nonce value.',
    'retry-safe-client-nonce-0001'
  ) is not null,
  'nonce uniqueness is scoped to the sender inside the conversation'
);

reset role;
set local role service_role;
select is(
  (
    select count(*)::integer
    from private.conversation_messages
    where conversation_id = (
      select c.id
      from private.introduction_conversations c
      where c.introduction_id = (select id from m9_ids where name = 'intro')
    )
  ),
  3,
  'the counterpart message is stored independently'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '24242424-2424-4424-8424-242424242423', true);
select throws_ok(
  $$select public.send_conversation_message_idempotent(
    (select id from m9_ids where name = 'intro'),
    'I am not part of this conversation.',
    'retry-safe-client-nonce-9999'
  )$$,
  'P0001',
  'conversation unavailable',
  'a non-participant still cannot send into another pair conversation'
);

reset role;
select * from finish();
rollback;
