begin;
select plan(7);

select is(
  has_function_privilege(
    'authenticated',
    'public.send_conversation_message_idempotent(uuid, text, text)',
    'EXECUTE'
  ),
  true,
  'authenticated members retain access to the hardened message send RPC'
);
select is(
  has_function_privilege(
    'anon',
    'public.send_conversation_message_idempotent(uuid, text, text)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot use the hardened message send RPC'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('26262626-2626-4626-8626-262626262621', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('26262626-2626-4626-8626-262626262622', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('26262626-2626-4626-8626-262626262621'),
  ('26262626-2626-4626-8626-262626262622')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id, user_id, status, gender, age_band_id, residency_type,
  current_country_code, current_city, marital_status, has_children,
  questionnaire_completed_at, submitted_at
) values
  ('26262626-aaaa-4aaa-8aaa-262626262621', '26262626-2626-4626-8626-262626262621', 'submitted', 'man', 2, 'libya', 'LY', 'Tripoli', 'never_married', false, now(), now() - interval '2 days'),
  ('26262626-bbbb-4bbb-8bbb-262626262622', '26262626-2626-4626-8626-262626262622', 'submitted', 'woman', 2, 'libya', 'LY', 'Benghazi', 'never_married', false, now(), now() - interval '1 day');

insert into public.waitlist_preferences (
  application_id, open_to_libya, open_to_diaspora,
  preferred_partner_age_min, preferred_partner_age_max,
  accepts_partner_with_children
) values
  ('26262626-aaaa-4aaa-8aaa-262626262621', true, true, 18, 60, 'depends'),
  ('26262626-bbbb-4bbb-8bbb-262626262622', true, true, 18, 60, 'depends');

insert into public.member_profiles (user_id, display_name, about_me, profile_completed_at) values
  ('26262626-2626-4626-8626-262626262621', 'Omar', 'A complete serious profile for serialized message rate-limit testing.', now()),
  ('26262626-2626-4626-8626-262626262622', 'Sara', 'A complete serious profile for serialized message rate-limit testing.', now());

create temporary table rate_limit_ids (
  name text primary key,
  id uuid not null
) on commit drop;
grant select, insert on rate_limit_ids to authenticated, service_role;

set local role service_role;
select public.set_member_profile_review_state('26262626-2626-4626-8626-262626262621', 'approved', 'm9-rate-limit', 'rate-limit-test', null);
select public.set_member_profile_review_state('26262626-2626-4626-8626-262626262622', 'approved', 'm9-rate-limit', 'rate-limit-test', null);

insert into rate_limit_ids (name, id)
select 'intro', public.create_controlled_introduction(
  '26262626-2626-4626-8626-262626262621',
  '26262626-2626-4626-8626-262626262622',
  clock_timestamp() + interval '7 days',
  'rate-limit-test'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '26262626-2626-4626-8626-262626262621', true);
select public.respond_to_introduction((select id from rate_limit_ids where name = 'intro'), true);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '26262626-2626-4626-8626-262626262622', true);
select public.respond_to_introduction((select id from rate_limit_ids where name = 'intro'), true);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '26262626-2626-4626-8626-262626262621', true);

insert into rate_limit_ids (name, id)
select 'first_message', public.send_conversation_message_idempotent(
  (select id from rate_limit_ids where name = 'intro'),
  'Rate-limit message 1',
  'rate-limit-nonce-0001'
);

select public.send_conversation_message_idempotent(
  (select id from rate_limit_ids where name = 'intro'),
  format('Rate-limit message %s', i),
  format('rate-limit-nonce-%s', lpad(i::text, 4, '0'))
)
from generate_series(2, 20) as i;

select is(
  (
    select count(*)::integer
    from public.list_my_conversation_messages_v2(
      (select id from rate_limit_ids where name = 'intro'),
      null,
      null,
      50
    )
  ),
  20,
  'the sender can reach exactly twenty messages inside the one-minute window'
);

select throws_ok(
  $$select public.send_conversation_message_idempotent(
    (select id from rate_limit_ids where name = 'intro'),
    'This message should exceed the one-minute limit.',
    'rate-limit-nonce-0021'
  )$$,
  'P0001',
  'message rate limit reached',
  'the twenty-first new message is rejected at the rate-limit boundary'
);

select is(
  public.send_conversation_message_idempotent(
    (select id from rate_limit_ids where name = 'intro'),
    'Rate-limit message 1',
    'rate-limit-nonce-0001'
  ),
  (select id from rate_limit_ids where name = 'first_message'),
  'an idempotent retry still succeeds after the sender reaches the rate cap'
);

select is(
  (
    select count(*)::integer
    from public.list_my_conversation_messages_v2(
      (select id from rate_limit_ids where name = 'intro'),
      null,
      null,
      50
    )
  ),
  20,
  'retrying an existing nonce at the cap does not create an extra message'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '26262626-2626-4626-8626-262626262622', true);
select ok(
  public.send_conversation_message_idempotent(
    (select id from rate_limit_ids where name = 'intro'),
    'The counterpart has an independent sender rate limit.',
    'rate-limit-other-0001'
  ) is not null,
  'rate limiting is scoped independently to each sender in the conversation'
);

reset role;
select * from finish();
rollback;
