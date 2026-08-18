begin;
select plan(17);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values
  (
    '32323232-3232-4323-8323-323232323201',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '32323232-3232-4323-8323-323232323202',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id, account_status)
values
  ('32323232-3232-4323-8323-323232323201', 'deletion_pending'),
  ('32323232-3232-4323-8323-323232323202', 'active')
on conflict (id) do update set account_status = excluded.account_status;

insert into public.deletion_requests (
  id,
  user_id,
  request_scope,
  status,
  requested_at,
  due_at
) values (
  '32323232-eeee-4eee-8eee-323232323201',
  '32323232-3232-4323-8323-323232323201',
  'entire_account',
  'requested',
  now() - interval '31 days',
  now() - interval '1 day'
);

set local role service_role;

insert into private.controlled_introductions (
  id,
  user_a_id,
  user_b_id,
  expires_at,
  created_by
) values (
  '32323232-aaaa-4aaa-8aaa-323232323201',
  '32323232-3232-4323-8323-323232323201',
  '32323232-3232-4323-8323-323232323202',
  clock_timestamp() + interval '7 days',
  'account-deletion-cross-feature-test'
);

insert into private.controlled_introduction_events (
  introduction_id,
  event_type,
  actor_reference
) values (
  '32323232-aaaa-4aaa-8aaa-323232323201',
  'created',
  'account-deletion-cross-feature-test'
);

update private.controlled_introductions
set user_a_decision = 'accepted',
    user_b_decision = 'accepted',
    status = 'mutually_accepted',
    mutually_accepted_at = clock_timestamp()
where id = '32323232-aaaa-4aaa-8aaa-323232323201';

insert into private.introduction_conversations (
  id,
  introduction_id,
  user_a_id,
  user_b_id
) values (
  '32323232-bbbb-4bbb-8bbb-323232323201',
  '32323232-aaaa-4aaa-8aaa-323232323201',
  '32323232-3232-4323-8323-323232323201',
  '32323232-3232-4323-8323-323232323202'
);

insert into private.conversation_events (
  conversation_id,
  event_type,
  actor_user_id
) values (
  '32323232-bbbb-4bbb-8bbb-323232323201',
  'opened',
  '32323232-3232-4323-8323-323232323202'
);

insert into private.conversation_messages (
  id,
  conversation_id,
  sender_user_id,
  body,
  client_nonce
) values (
  '32323232-cccc-4ccc-8ccc-323232323201',
  '32323232-bbbb-4bbb-8bbb-323232323201',
  '32323232-3232-4323-8323-323232323202',
  'A private message that must not survive account deletion.',
  'account-delete-msg-0001'
);

insert into private.conversation_member_reads (
  conversation_id,
  user_id,
  last_read_at
) values
  (
    '32323232-bbbb-4bbb-8bbb-323232323201',
    '32323232-3232-4323-8323-323232323201',
    clock_timestamp()
  ),
  (
    '32323232-bbbb-4bbb-8bbb-323232323201',
    '32323232-3232-4323-8323-323232323202',
    clock_timestamp()
  );

insert into public.safety_reports (
  id,
  reporter_user_id,
  target_user_id,
  category,
  details
) values (
  '32323232-dddd-4ddd-8ddd-323232323201',
  '32323232-3232-4323-8323-323232323202',
  '32323232-3232-4323-8323-323232323201',
  'safety_concern',
  'Structured moderation evidence may remain, but this free text must be erased.'
);

reset role;

select is(
  (select count(*)::integer from private.member_notifications where introduction_id = '32323232-aaaa-4aaa-8aaa-323232323201'),
  5,
  'fixture creates two offer, two mutual-acceptance, and one incoming-message activity records'
);

select is(
  (select count(*)::integer from private.conversation_member_reads where conversation_id = '32323232-bbbb-4bbb-8bbb-323232323201'),
  2,
  'fixture creates read state for both conversation members'
);

set local role service_role;
create temporary table claimed_cross_feature_deletion on commit drop as
select * from public.claim_due_account_deletions(5);
reset role;

select is(
  (select count(*)::integer from claimed_cross_feature_deletion where user_id = '32323232-3232-4323-8323-323232323201'),
  1,
  'deleting member is claimed by the account-deletion worker'
);

set local role service_role;
select public.purge_account_private_data('32323232-3232-4323-8323-323232323201');
reset role;

select is(
  (select details from public.safety_reports where id = '32323232-dddd-4ddd-8ddd-323232323201'),
  null,
  'private safety-report free text is erased before Auth deletion'
);

-- This mirrors admin.auth.admin.deleteUser(): auth deletion cascades through
-- public.users and every member-product foreign key beneath it.
delete from auth.users
where id = '32323232-3232-4323-8323-323232323201';

select is(
  (select count(*)::integer from public.users where id = '32323232-3232-4323-8323-323232323201'),
  0,
  'deleted Auth identity removes the member product row'
);

select is(
  (select count(*)::integer from public.users where id = '32323232-3232-4323-8323-323232323202'),
  1,
  'counterpart account is preserved'
);

select is(
  (select count(*)::integer from private.controlled_introductions where id = '32323232-aaaa-4aaa-8aaa-323232323201'),
  0,
  'controlled introduction is removed when either participant deletes their account'
);

select is(
  (select count(*)::integer from private.controlled_introduction_events where introduction_id = '32323232-aaaa-4aaa-8aaa-323232323201'),
  0,
  'introduction audit rows tied only to the deleted introduction are removed'
);

select is(
  (select count(*)::integer from private.introduction_conversations where id = '32323232-bbbb-4bbb-8bbb-323232323201'),
  0,
  'private conversation is removed with the deleted introduction'
);

select is(
  (select count(*)::integer from private.conversation_messages where id = '32323232-cccc-4ccc-8ccc-323232323201'),
  0,
  'private message content is removed with the conversation'
);

select is(
  (select count(*)::integer from private.conversation_events where conversation_id = '32323232-bbbb-4bbb-8bbb-323232323201'),
  0,
  'conversation events are removed with the conversation'
);

select is(
  (select count(*)::integer from private.conversation_member_reads where conversation_id = '32323232-bbbb-4bbb-8bbb-323232323201'),
  0,
  'both members read cursors are removed with the conversation'
);

select is(
  (select count(*)::integer from private.member_notifications where introduction_id = '32323232-aaaa-4aaa-8aaa-323232323201'),
  0,
  'activity records referencing the deleted introduction or message are removed for both members'
);

select is(
  (select count(*)::integer from public.deletion_requests where id = '32323232-eeee-4eee-8eee-323232323201'),
  0,
  'member-visible deletion request is removed with the deleted account'
);

select ok(
  exists (
    select 1
    from public.safety_reports
    where id = '32323232-dddd-4ddd-8ddd-323232323201'
      and reporter_user_id = '32323232-3232-4323-8323-323232323202'
      and target_user_id is null
      and details is null
      and category = 'safety_concern'::public.safety_report_category
  ),
  'minimum structured safety evidence survives without the deleted identity or free text'
);

set local role service_role;
select public.mark_account_deletion_completed('32323232-eeee-4eee-8eee-323232323201');
reset role;

select ok(
  exists (
    select 1
    from private.account_deletion_tombstones
    where request_id = '32323232-eeee-4eee-8eee-323232323201'
      and state = 'completed'
      and user_id is null
      and completed_at is not null
  ),
  'deletion tombstone records completion without retaining the member id'
);

select is(
  (select count(*)::integer from auth.users where id = '32323232-3232-4323-8323-323232323202'),
  1,
  'counterpart Auth identity remains intact'
);

select * from finish();
rollback;
