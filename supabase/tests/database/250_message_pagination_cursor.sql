begin;
select plan(11);

select is(
  has_function_privilege(
    'authenticated',
    'public.list_my_conversation_messages_v2(uuid, timestamptz, uuid, integer)',
    'EXECUTE'
  ),
  true,
  'authenticated members can use lossless message pagination'
);
select is(
  has_function_privilege(
    'anon',
    'public.list_my_conversation_messages_v2(uuid, timestamptz, uuid, integer)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot use lossless message pagination'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('25252525-2525-4525-8525-252525252521', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('25252525-2525-4525-8525-252525252522', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('25252525-2525-4525-8525-252525252521'),
  ('25252525-2525-4525-8525-252525252522')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id, user_id, status, gender, age_band_id, residency_type,
  current_country_code, current_city, marital_status, has_children,
  questionnaire_completed_at, submitted_at
) values
  ('25252525-aaaa-4aaa-8aaa-252525252521', '25252525-2525-4525-8525-252525252521', 'submitted', 'man', 2, 'libya', 'LY', 'Tripoli', 'never_married', false, now(), now() - interval '2 days'),
  ('25252525-bbbb-4bbb-8bbb-252525252522', '25252525-2525-4525-8525-252525252522', 'submitted', 'woman', 2, 'libya', 'LY', 'Benghazi', 'never_married', false, now(), now() - interval '1 day');

insert into public.waitlist_preferences (
  application_id, open_to_libya, open_to_diaspora,
  preferred_partner_age_min, preferred_partner_age_max,
  accepts_partner_with_children
) values
  ('25252525-aaaa-4aaa-8aaa-252525252521', true, true, 18, 60, 'depends'),
  ('25252525-bbbb-4bbb-8bbb-252525252522', true, true, 18, 60, 'depends');

insert into public.member_profiles (user_id, display_name, about_me, profile_completed_at) values
  ('25252525-2525-4525-8525-252525252521', 'Omar', 'A complete serious profile for lossless message pagination testing.', now()),
  ('25252525-2525-4525-8525-252525252522', 'Sara', 'A complete serious profile for lossless message pagination testing.', now());

create temporary table pagination_ids (
  name text primary key,
  id uuid not null
) on commit drop;
grant select, insert on pagination_ids to authenticated, service_role;

create temporary table pagination_page_1 (
  message_id uuid,
  sender_is_me boolean,
  body text,
  sent_at timestamptz
) on commit drop;
create temporary table pagination_page_2 (like pagination_page_1) on commit drop;
create temporary table pagination_page_3 (like pagination_page_1) on commit drop;
grant select, insert on pagination_page_1, pagination_page_2, pagination_page_3 to authenticated;

set local role service_role;
select public.set_member_profile_review_state('25252525-2525-4525-8525-252525252521', 'approved', 'm9-pagination', 'pagination-test', null);
select public.set_member_profile_review_state('25252525-2525-4525-8525-252525252522', 'approved', 'm9-pagination', 'pagination-test', null);

insert into pagination_ids (name, id)
select 'intro', public.create_controlled_introduction(
  '25252525-2525-4525-8525-252525252521',
  '25252525-2525-4525-8525-252525252522',
  clock_timestamp() + interval '7 days',
  'pagination-test'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '25252525-2525-4525-8525-252525252521', true);
select public.respond_to_introduction((select id from pagination_ids where name = 'intro'), true);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '25252525-2525-4525-8525-252525252522', true);
select public.respond_to_introduction((select id from pagination_ids where name = 'intro'), true);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '25252525-2525-4525-8525-252525252521', true);
insert into pagination_ids (name, id)
select 'conversation', public.open_my_conversation((select id from pagination_ids where name = 'intro'));

select throws_ok(
  $$select * from public.list_my_conversation_messages_v2(
    (select id from pagination_ids where name = 'intro'),
    clock_timestamp(),
    null,
    2
  )$$,
  'P0001',
  'message cursor requires timestamp and id',
  'timestamp-only cursors are rejected rather than risking skipped messages'
);
select throws_ok(
  $$select * from public.list_my_conversation_messages_v2(
    (select id from pagination_ids where name = 'intro'),
    null,
    '25252525-0000-4000-8000-000000000001',
    2
  )$$,
  'P0001',
  'message cursor requires timestamp and id',
  'id-only cursors are rejected rather than risking ambiguous pagination'
);

reset role;
set local role service_role;
insert into private.conversation_messages (id, conversation_id, sender_user_id, body, sent_at) values
  ('25252525-0000-4000-8000-000000000001', (select id from pagination_ids where name = 'conversation'), '25252525-2525-4525-8525-252525252521', 'Message 1', '2026-08-18 05:00:00+00'),
  ('25252525-0000-4000-8000-000000000002', (select id from pagination_ids where name = 'conversation'), '25252525-2525-4525-8525-252525252521', 'Message 2', '2026-08-18 05:00:00+00'),
  ('25252525-0000-4000-8000-000000000003', (select id from pagination_ids where name = 'conversation'), '25252525-2525-4525-8525-252525252521', 'Message 3', '2026-08-18 05:00:00+00'),
  ('25252525-0000-4000-8000-000000000004', (select id from pagination_ids where name = 'conversation'), '25252525-2525-4525-8525-252525252521', 'Message 4', '2026-08-18 05:00:00+00'),
  ('25252525-0000-4000-8000-000000000005', (select id from pagination_ids where name = 'conversation'), '25252525-2525-4525-8525-252525252521', 'Message 5', '2026-08-18 05:00:00+00');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '25252525-2525-4525-8525-252525252521', true);

insert into pagination_page_1
select * from public.list_my_conversation_messages_v2(
  (select id from pagination_ids where name = 'intro'),
  null,
  null,
  2
);

select is((select count(*)::integer from pagination_page_1), 2, 'first page returns the requested number of messages');
select is(
  (select array_agg(message_id order by message_id) from pagination_page_1),
  array[
    '25252525-0000-4000-8000-000000000004'::uuid,
    '25252525-0000-4000-8000-000000000005'::uuid
  ],
  'first page returns the two newest same-timestamp messages'
);

insert into pagination_page_2
select * from public.list_my_conversation_messages_v2(
  (select id from pagination_ids where name = 'intro'),
  (select sent_at from pagination_page_1 order by sent_at, message_id limit 1),
  (select message_id from pagination_page_1 order by sent_at, message_id limit 1),
  2
);

select is((select count(*)::integer from pagination_page_2), 2, 'second page remains full at a shared timestamp boundary');
select is(
  (select array_agg(message_id order by message_id) from pagination_page_2),
  array[
    '25252525-0000-4000-8000-000000000002'::uuid,
    '25252525-0000-4000-8000-000000000003'::uuid
  ],
  'second page continues by message id without skipping equal timestamps'
);

insert into pagination_page_3
select * from public.list_my_conversation_messages_v2(
  (select id from pagination_ids where name = 'intro'),
  (select sent_at from pagination_page_2 order by sent_at, message_id limit 1),
  (select message_id from pagination_page_2 order by sent_at, message_id limit 1),
  2
);

select is((select count(*)::integer from pagination_page_3), 1, 'final page returns the remaining message');
select is(
  (select message_id from pagination_page_3),
  '25252525-0000-4000-8000-000000000001'::uuid,
  'final same-timestamp message is not lost at the cursor boundary'
);
select is(
  (
    select count(distinct message_id)::integer
    from (
      select message_id from pagination_page_1
      union all
      select message_id from pagination_page_2
      union all
      select message_id from pagination_page_3
    ) pages
  ),
  5,
  'walking every page returns all messages exactly once'
);

reset role;
select * from finish();
rollback;
