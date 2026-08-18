begin;
select plan(25);

select is(
  has_function_privilege('authenticated', 'public.open_my_conversation(uuid)', 'EXECUTE'),
  true,
  'authenticated members can open a guarded conversation after mutual acceptance'
);
select is(
  has_function_privilege('anon', 'public.open_my_conversation(uuid)', 'EXECUTE'),
  false,
  'anonymous clients cannot open conversations'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.list_my_conversation_messages(uuid, timestamptz, integer)',
    'EXECUTE'
  ),
  true,
  'authenticated members can list messages through the guarded RPC'
);
select is(
  has_function_privilege('authenticated', 'public.send_conversation_message(uuid, text)', 'EXECUTE'),
  true,
  'authenticated members can send through the guarded RPC'
);
select is(
  has_function_privilege('authenticated', 'public.end_my_conversation(uuid)', 'EXECUTE'),
  true,
  'authenticated members can end their own controlled conversation'
);
select is(
  has_table_privilege('authenticated', 'private.introduction_conversations', 'SELECT'),
  false,
  'members cannot read raw conversation rows'
);
select is(
  has_table_privilege('authenticated', 'private.conversation_messages', 'SELECT'),
  false,
  'members cannot read raw message rows'
);
select is(
  has_table_privilege('authenticated', 'private.conversation_events', 'SELECT'),
  false,
  'members cannot read raw conversation audit events'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('21212121-2121-4121-8121-212121212111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('21212121-2121-4121-8121-212121212112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('21212121-2121-4121-8121-212121212113', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('21212121-2121-4121-8121-212121212114', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('21212121-2121-4121-8121-212121212115', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('21212121-2121-4121-8121-212121212111'),
  ('21212121-2121-4121-8121-212121212112'),
  ('21212121-2121-4121-8121-212121212113'),
  ('21212121-2121-4121-8121-212121212114'),
  ('21212121-2121-4121-8121-212121212115')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id, user_id, status, gender, age_band_id, residency_type,
  current_country_code, current_city, marital_status, has_children,
  questionnaire_completed_at, submitted_at
) values
  ('21212121-aaaa-4aaa-8aaa-212121212111', '21212121-2121-4121-8121-212121212111', 'submitted', 'man', 2, 'libya', 'LY', 'Tripoli', 'never_married', false, now(), now() - interval '5 days'),
  ('21212121-bbbb-4bbb-8bbb-212121212112', '21212121-2121-4121-8121-212121212112', 'submitted', 'woman', 2, 'libya', 'LY', 'Benghazi', 'never_married', false, now(), now() - interval '4 days'),
  ('21212121-cccc-4ccc-8ccc-212121212113', '21212121-2121-4121-8121-212121212113', 'submitted', 'woman', 2, 'libya', 'LY', 'Misrata', 'never_married', false, now(), now() - interval '3 days'),
  ('21212121-dddd-4ddd-8ddd-212121212114', '21212121-2121-4121-8121-212121212114', 'submitted', 'man', 2, 'libya', 'LY', 'Zawiya', 'never_married', false, now(), now() - interval '2 days'),
  ('21212121-eeee-4eee-8eee-212121212115', '21212121-2121-4121-8121-212121212115', 'submitted', 'man', 3, 'libya', 'LY', 'Tripoli', 'never_married', false, now(), now() - interval '1 day');

insert into public.waitlist_preferences (
  application_id, open_to_libya, open_to_diaspora,
  preferred_partner_age_min, preferred_partner_age_max,
  accepts_partner_with_children
) values
  ('21212121-aaaa-4aaa-8aaa-212121212111', true, true, 18, 60, 'depends'),
  ('21212121-bbbb-4bbb-8bbb-212121212112', true, true, 18, 60, 'depends'),
  ('21212121-cccc-4ccc-8ccc-212121212113', true, true, 18, 60, 'depends'),
  ('21212121-dddd-4ddd-8ddd-212121212114', true, true, 18, 60, 'depends'),
  ('21212121-eeee-4eee-8eee-212121212115', true, true, 18, 60, 'depends');

insert into public.member_profiles (user_id, display_name, about_me, profile_completed_at) values
  ('21212121-2121-4121-8121-212121212111', 'Omar', 'A complete serious profile used for private conversation access testing.', now()),
  ('21212121-2121-4121-8121-212121212112', 'Sara', 'A complete serious profile used for private conversation access testing.', now()),
  ('21212121-2121-4121-8121-212121212113', 'Mariam', 'A complete serious profile used for private conversation access testing.', now()),
  ('21212121-2121-4121-8121-212121212114', 'Khaled', 'A complete serious profile used for private conversation access testing.', now()),
  ('21212121-2121-4121-8121-212121212115', 'Yousef', 'A complete serious profile used as a non-participant in conversation tests.', now());

create temporary table m7_ids (
  name text primary key,
  id uuid not null
) on commit drop;
grant select, insert on m7_ids to authenticated, service_role;

set local role service_role;
select public.set_member_profile_review_state('21212121-2121-4121-8121-212121212111', 'approved', 'm7', 'conversation-test', null);
select public.set_member_profile_review_state('21212121-2121-4121-8121-212121212112', 'approved', 'm7', 'conversation-test', null);
select public.set_member_profile_review_state('21212121-2121-4121-8121-212121212113', 'approved', 'm7', 'conversation-test', null);
select public.set_member_profile_review_state('21212121-2121-4121-8121-212121212114', 'approved', 'm7', 'conversation-test', null);
select public.set_member_profile_review_state('21212121-2121-4121-8121-212121212115', 'approved', 'm7', 'conversation-test', null);

insert into m7_ids (name, id)
select 'chat', public.create_controlled_introduction(
  '21212121-2121-4121-8121-212121212111',
  '21212121-2121-4121-8121-212121212112',
  clock_timestamp() + interval '7 days',
  'conversation-test'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '21212121-2121-4121-8121-212121212111', true);
select throws_ok(
  $$select public.open_my_conversation((select id from m7_ids where name = 'chat'))$$,
  'P0001',
  'conversation unavailable',
  'conversation cannot open before mutual acceptance'
);
select is(
  public.respond_to_introduction((select id from m7_ids where name = 'chat'), true),
  'offered'::public.introduction_status,
  'first participant can accept the introduction'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '21212121-2121-4121-8121-212121212112', true);
select is(
  public.respond_to_introduction((select id from m7_ids where name = 'chat'), true),
  'mutually_accepted'::public.introduction_status,
  'second acceptance makes the introduction eligible for conversation'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '21212121-2121-4121-8121-212121212111', true);
insert into m7_ids (name, id)
select 'conversation', public.open_my_conversation((select id from m7_ids where name = 'chat'));
select ok(
  (select id from m7_ids where name = 'conversation') is not null,
  'first participant opens exactly one private conversation'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '21212121-2121-4121-8121-212121212112', true);
select is(
  public.open_my_conversation((select id from m7_ids where name = 'chat')),
  (select id from m7_ids where name = 'conversation'),
  'second participant resolves the same conversation instead of creating another one'
);

reset role;
set local role service_role;
select is(
  (select count(*)::integer from private.conversation_events where conversation_id = (select id from m7_ids where name = 'conversation') and event_type = 'opened'),
  1,
  'conversation opening is audited exactly once'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '21212121-2121-4121-8121-212121212111', true);
select ok(
  public.send_conversation_message((select id from m7_ids where name = 'chat'), 'Assalamu alaikum, thank you for accepting.') is not null,
  'first participant can send after mutual acceptance'
);
select throws_ok(
  $$select public.send_conversation_message((select id from m7_ids where name = 'chat'), '   ')$$,
  'P0001',
  'message must be between 1 and 2000 characters',
  'blank messages are rejected server-side'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '21212121-2121-4121-8121-212121212112', true);
select ok(
  public.send_conversation_message((select id from m7_ids where name = 'chat'), 'Wa alaikum assalam. I appreciate the clear introduction.') is not null,
  'second participant can reply in the same conversation'
);
select is(
  (select count(*)::integer from public.list_my_conversation_messages((select id from m7_ids where name = 'chat'), null, 50)),
  2,
  'participant reads only the guarded message projection'
);
select is(
  (select count(*)::integer from public.list_my_conversation_messages((select id from m7_ids where name = 'chat'), null, 50) where sender_is_me),
  1,
  'message projection identifies only the current member own message without exposing sender UUIDs'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '21212121-2121-4121-8121-212121212115', true);
select throws_ok(
  $$select * from public.list_my_conversation_messages((select id from m7_ids where name = 'chat'), null, 50)$$,
  'P0001',
  'conversation unavailable',
  'non-participant cannot read another introduction conversation'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '21212121-2121-4121-8121-212121212111', true);
select is(
  public.end_my_conversation((select id from m7_ids where name = 'chat')),
  true,
  'either participant can end a mutually accepted conversation'
);
select throws_ok(
  $$select * from public.list_my_conversation_messages((select id from m7_ids where name = 'chat'), null, 50)$$,
  'P0001',
  'conversation unavailable',
  'closed conversation messages are no longer exposed through the member RPC'
);

reset role;
set local role service_role;
select is(
  (select status from private.controlled_introductions where id = (select id from m7_ids where name = 'chat')),
  'closed'::public.introduction_status,
  'ending conversation also closes the controlled introduction'
);
select is(
  (select status from private.introduction_conversations where id = (select id from m7_ids where name = 'conversation')),
  'closed'::public.conversation_status,
  'ending conversation closes the private conversation row'
);

insert into m7_ids (name, id)
select 'blocked-chat', public.create_controlled_introduction(
  '21212121-2121-4121-8121-212121212114',
  '21212121-2121-4121-8121-212121212113',
  clock_timestamp() + interval '7 days',
  'conversation-test'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '21212121-2121-4121-8121-212121212114', true);
select public.respond_to_introduction((select id from m7_ids where name = 'blocked-chat'), true);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '21212121-2121-4121-8121-212121212113', true);
select public.respond_to_introduction((select id from m7_ids where name = 'blocked-chat'), true);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '21212121-2121-4121-8121-212121212114', true);
select public.block_introduction_member((select id from m7_ids where name = 'blocked-chat'));
select throws_ok(
  $$select public.send_conversation_message((select id from m7_ids where name = 'blocked-chat'), 'This should never send.')$$,
  'P0001',
  'conversation unavailable',
  'blocking prevents conversation creation or messaging even after prior mutual acceptance'
);

reset role;
select * from finish();
rollback;
