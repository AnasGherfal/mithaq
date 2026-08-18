begin;
select plan(17);

select is(
  has_function_privilege('authenticated', 'public.mark_my_conversation_read(uuid, timestamptz)', 'EXECUTE'),
  true,
  'authenticated members can update only their guarded conversation read state'
);
select is(
  has_function_privilege('anon', 'public.mark_my_conversation_read(uuid, timestamptz)', 'EXECUTE'),
  false,
  'anonymous clients cannot mark conversations read'
);
select is(
  has_function_privilege('authenticated', 'public.list_my_conversation_unread_counts()', 'EXECUTE'),
  true,
  'authenticated members can list their own unread counts'
);
select is(
  has_function_privilege('anon', 'public.list_my_conversation_unread_counts()', 'EXECUTE'),
  false,
  'anonymous clients cannot list unread counts'
);
select is(
  has_table_privilege('authenticated', 'private.conversation_member_reads', 'SELECT'),
  false,
  'members cannot read raw conversation read-state rows'
);
select is(
  has_table_privilege('authenticated', 'private.conversation_member_reads', 'INSERT'),
  false,
  'members cannot forge raw conversation read-state rows'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('22222222-2222-4222-8222-222222222221', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('22222222-2222-4222-8222-222222222223', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('22222222-2222-4222-8222-222222222221'),
  ('22222222-2222-4222-8222-222222222222'),
  ('22222222-2222-4222-8222-222222222223')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id, user_id, status, gender, age_band_id, residency_type,
  current_country_code, current_city, marital_status, has_children,
  questionnaire_completed_at, submitted_at
) values
  ('22222222-aaaa-4aaa-8aaa-222222222221', '22222222-2222-4222-8222-222222222221', 'submitted', 'man', 2, 'libya', 'LY', 'Tripoli', 'never_married', false, now(), now() - interval '3 days'),
  ('22222222-bbbb-4bbb-8bbb-222222222222', '22222222-2222-4222-8222-222222222222', 'submitted', 'woman', 2, 'libya', 'LY', 'Benghazi', 'never_married', false, now(), now() - interval '2 days'),
  ('22222222-cccc-4ccc-8ccc-222222222223', '22222222-2222-4222-8222-222222222223', 'submitted', 'man', 3, 'libya', 'LY', 'Misrata', 'never_married', false, now(), now() - interval '1 day');

insert into public.waitlist_preferences (
  application_id, open_to_libya, open_to_diaspora,
  preferred_partner_age_min, preferred_partner_age_max,
  accepts_partner_with_children
) values
  ('22222222-aaaa-4aaa-8aaa-222222222221', true, true, 18, 60, 'depends'),
  ('22222222-bbbb-4bbb-8bbb-222222222222', true, true, 18, 60, 'depends'),
  ('22222222-cccc-4ccc-8ccc-222222222223', true, true, 18, 60, 'depends');

insert into public.member_profiles (user_id, display_name, about_me, profile_completed_at) values
  ('22222222-2222-4222-8222-222222222221', 'Omar', 'A complete serious profile used for private unread-state testing.', now()),
  ('22222222-2222-4222-8222-222222222222', 'Sara', 'A complete serious profile used for private unread-state testing.', now()),
  ('22222222-2222-4222-8222-222222222223', 'Yousef', 'A complete serious non-participant profile used for access testing.', now());

create temporary table m7_read_ids (
  name text primary key,
  id uuid not null
) on commit drop;
grant select, insert on m7_read_ids to authenticated, service_role;

set local role service_role;
select public.set_member_profile_review_state('22222222-2222-4222-8222-222222222221', 'approved', 'm7-read', 'read-test', null);
select public.set_member_profile_review_state('22222222-2222-4222-8222-222222222222', 'approved', 'm7-read', 'read-test', null);
select public.set_member_profile_review_state('22222222-2222-4222-8222-222222222223', 'approved', 'm7-read', 'read-test', null);

insert into m7_read_ids (name, id)
select 'intro', public.create_controlled_introduction(
  '22222222-2222-4222-8222-222222222221',
  '22222222-2222-4222-8222-222222222222',
  clock_timestamp() + interval '7 days',
  'read-test'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', true);
select public.respond_to_introduction((select id from m7_read_ids where name = 'intro'), true);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select public.respond_to_introduction((select id from m7_read_ids where name = 'intro'), true);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', true);
select public.send_conversation_message((select id from m7_read_ids where name = 'intro'), 'Assalamu alaikum.');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select public.send_conversation_message((select id from m7_read_ids where name = 'intro'), 'Wa alaikum assalam.');
select public.send_conversation_message((select id from m7_read_ids where name = 'intro'), 'Thank you for the introduction.');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', true);
select is(
  (select unread_count from public.list_my_conversation_unread_counts() where introduction_id = (select id from m7_read_ids where name = 'intro')),
  2::bigint,
  'first member sees only counterpart messages as unread'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select is(
  (select unread_count from public.list_my_conversation_unread_counts() where introduction_id = (select id from m7_read_ids where name = 'intro')),
  1::bigint,
  'second member unread count excludes their own messages'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', true);
select ok(
  public.mark_my_conversation_read((select id from m7_read_ids where name = 'intro'), null) is not null,
  'member can mark the accessible conversation read'
);
select is(
  (select unread_count from public.list_my_conversation_unread_counts() where introduction_id = (select id from m7_read_ids where name = 'intro')),
  0::bigint,
  'marking read clears the current member unread count'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select public.send_conversation_message((select id from m7_read_ids where name = 'intro'), 'A new message after the read cursor.');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', true);
select is(
  (select unread_count from public.list_my_conversation_unread_counts() where introduction_id = (select id from m7_read_ids where name = 'intro')),
  1::bigint,
  'a later counterpart message becomes unread after the saved cursor'
);
select cmp_ok(
  public.mark_my_conversation_read(
    (select id from m7_read_ids where name = 'intro'),
    clock_timestamp() + interval '1 day'
  ),
  '<=',
  clock_timestamp(),
  'a client cannot move its read cursor into the future'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222223', true);
select throws_ok(
  $$select public.mark_my_conversation_read((select id from m7_read_ids where name = 'intro'), null)$$,
  'P0001',
  'conversation unavailable',
  'non-participant cannot alter another conversation read state'
);
select is(
  (select count(*)::integer from public.list_my_conversation_unread_counts()),
  0,
  'non-participant receives no unread metadata about another conversation'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222221', true);
select is(
  public.block_introduction_member((select id from m7_read_ids where name = 'intro')),
  true,
  'member can block the counterpart from the active introduction'
);
select is(
  (select count(*)::integer from public.list_my_conversation_unread_counts() where introduction_id = (select id from m7_read_ids where name = 'intro')),
  0,
  'blocked conversations disappear from member unread projections'
);
select throws_ok(
  $$select public.mark_my_conversation_read((select id from m7_read_ids where name = 'intro'), null)$$,
  'P0001',
  'conversation unavailable',
  'blocked conversations cannot accept read-state updates'
);

reset role;
select * from finish();
rollback;
