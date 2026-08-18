begin;
select plan(20);

select is(
  has_function_privilege('authenticated', 'public.list_my_notifications(timestamptz, integer)', 'EXECUTE'),
  true,
  'authenticated members can list their guarded notifications'
);
select is(
  has_function_privilege('anon', 'public.list_my_notifications(timestamptz, integer)', 'EXECUTE'),
  false,
  'anonymous clients cannot list notifications'
);
select is(
  has_function_privilege('authenticated', 'public.get_my_notification_unread_count()', 'EXECUTE'),
  true,
  'authenticated members can read their own notification count'
);
select is(
  has_function_privilege('anon', 'public.get_my_notification_unread_count()', 'EXECUTE'),
  false,
  'anonymous clients cannot read notification counts'
);
select is(
  has_function_privilege('authenticated', 'public.mark_my_notifications_read(timestamptz)', 'EXECUTE'),
  true,
  'authenticated members can mark only their guarded notifications read'
);
select is(
  has_table_privilege('authenticated', 'private.member_notifications', 'SELECT'),
  false,
  'members cannot read raw notification rows'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('23232323-2323-4323-8323-232323232321', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('23232323-2323-4323-8323-232323232322', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('23232323-2323-4323-8323-232323232323', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('23232323-2323-4323-8323-232323232321'),
  ('23232323-2323-4323-8323-232323232322'),
  ('23232323-2323-4323-8323-232323232323')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id, user_id, status, gender, age_band_id, residency_type,
  current_country_code, current_city, marital_status, has_children,
  questionnaire_completed_at, submitted_at
) values
  ('23232323-aaaa-4aaa-8aaa-232323232321', '23232323-2323-4323-8323-232323232321', 'submitted', 'man', 2, 'libya', 'LY', 'Tripoli', 'never_married', false, now(), now() - interval '3 days'),
  ('23232323-bbbb-4bbb-8bbb-232323232322', '23232323-2323-4323-8323-232323232322', 'submitted', 'woman', 2, 'libya', 'LY', 'Benghazi', 'never_married', false, now(), now() - interval '2 days'),
  ('23232323-cccc-4ccc-8ccc-232323232323', '23232323-2323-4323-8323-232323232323', 'submitted', 'man', 3, 'libya', 'LY', 'Misrata', 'never_married', false, now(), now() - interval '1 day');

insert into public.waitlist_preferences (
  application_id, open_to_libya, open_to_diaspora,
  preferred_partner_age_min, preferred_partner_age_max,
  accepts_partner_with_children
) values
  ('23232323-aaaa-4aaa-8aaa-232323232321', true, true, 18, 60, 'depends'),
  ('23232323-bbbb-4bbb-8bbb-232323232322', true, true, 18, 60, 'depends'),
  ('23232323-cccc-4ccc-8ccc-232323232323', true, true, 18, 60, 'depends');

insert into public.member_profiles (user_id, display_name, about_me, profile_completed_at) values
  ('23232323-2323-4323-8323-232323232321', 'Omar', 'A complete serious profile for private notification testing.', now()),
  ('23232323-2323-4323-8323-232323232322', 'Sara', 'A complete serious profile for private notification testing.', now()),
  ('23232323-2323-4323-8323-232323232323', 'Yousef', 'A complete serious non-participant profile for access testing.', now());

create temporary table notification_test_ids (
  name text primary key,
  id uuid not null
) on commit drop;
grant select, insert on notification_test_ids to authenticated, service_role;

set local role service_role;
select public.set_member_profile_review_state('23232323-2323-4323-8323-232323232321', 'approved', 'notification-test', 'notification-test', null);
select public.set_member_profile_review_state('23232323-2323-4323-8323-232323232322', 'approved', 'notification-test', 'notification-test', null);
select public.set_member_profile_review_state('23232323-2323-4323-8323-232323232323', 'approved', 'notification-test', 'notification-test', null);

insert into notification_test_ids (name, id)
select 'intro', public.create_controlled_introduction(
  '23232323-2323-4323-8323-232323232321',
  '23232323-2323-4323-8323-232323232322',
  clock_timestamp() + interval '7 days',
  'notification-test'
);

select is(
  (select count(*)::integer from private.member_notifications where user_id = '23232323-2323-4323-8323-232323232321' and kind = 'introduction_offered'),
  1,
  'creating an introduction creates one private offer notification for the first member'
);
select is(
  (select count(*)::integer from private.member_notifications where user_id = '23232323-2323-4323-8323-232323232322' and kind = 'introduction_offered'),
  1,
  'creating an introduction creates one private offer notification for the second member'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '23232323-2323-4323-8323-232323232321', true);

select is(
  (select count(*)::integer from public.list_my_notifications(null, 50)),
  1,
  'a member lists only their own introduction notification'
);
select is(
  public.get_my_notification_unread_count(),
  1::bigint,
  'new introduction notification starts unread'
);
select is(
  public.mark_my_notifications_read(null),
  1,
  'member can mark their own current notifications read'
);
select is(
  public.get_my_notification_unread_count(),
  0::bigint,
  'marking notifications read clears the current member count'
);

select public.respond_to_introduction((select id from notification_test_ids where name = 'intro'), true);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '23232323-2323-4323-8323-232323232322', true);
select public.respond_to_introduction((select id from notification_test_ids where name = 'intro'), true);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '23232323-2323-4323-8323-232323232321', true);
select public.send_conversation_message((select id from notification_test_ids where name = 'intro'), 'Assalamu alaikum.');

reset role;
set local role service_role;
select is(
  (select count(*)::integer from private.member_notifications where user_id = '23232323-2323-4323-8323-232323232322' and kind = 'message_received'),
  1,
  'sending a message creates one private notification for the recipient'
);
select is(
  (select count(*)::integer from private.member_notifications where user_id = '23232323-2323-4323-8323-232323232321' and kind = 'message_received'),
  0,
  'message sender does not receive a notification for their own message'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '23232323-2323-4323-8323-232323232322', true);
select is(
  (select count(*)::integer from public.list_my_notifications(null, 50)),
  2,
  'recipient sees their introduction and message notifications only'
);
select is(
  public.get_my_notification_unread_count(),
  2::bigint,
  'recipient unread count includes both unread notification types'
);
select is(
  (select count(*)::integer from public.list_my_notifications(null, 50) where notification_kind = 'message_received'),
  1,
  'message notification is exposed without raw message content'
);
select is(
  public.mark_my_notifications_read(null),
  2,
  'recipient can mark all current notifications read'
);
select is(
  public.get_my_notification_unread_count(),
  0::bigint,
  'recipient unread count clears after marking read'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '23232323-2323-4323-8323-232323232323', true);
select is(
  (select count(*)::integer from public.list_my_notifications(null, 50)),
  0,
  'unrelated members cannot discover another member notification activity'
);
select throws_ok(
  $$select * from public.list_my_notifications(null, 0)$$,
  'P0001',
  'notification limit must be between 1 and 100',
  'notification listing rejects invalid page sizes'
);

reset role;
select * from finish();
rollback;
