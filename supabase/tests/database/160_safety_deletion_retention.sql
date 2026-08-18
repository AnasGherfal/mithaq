begin;
select plan(12);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values
  (
    '16161616-1616-4616-8616-161616161611',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '16161616-1616-4616-8616-161616161612',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('16161616-1616-4616-8616-161616161611'),
  ('16161616-1616-4616-8616-161616161612')
on conflict (id) do nothing;

insert into public.safety_reports (
  id,
  reporter_user_id,
  target_user_id,
  category,
  details
) values (
  '16161616-aaaa-4aaa-8aaa-161616161611',
  '16161616-1616-4616-8616-161616161611',
  '16161616-1616-4616-8616-161616161612',
  'safety_concern',
  'Free text can contain personal context about both people and must not survive account deletion.'
);

insert into public.member_blocks (blocker_user_id, blocked_user_id)
values (
  '16161616-1616-4616-8616-161616161611',
  '16161616-1616-4616-8616-161616161612'
);

select is(
  (select count(*)::integer from public.safety_reports where id = '16161616-aaaa-4aaa-8aaa-161616161611'),
  1,
  'the structured safety report exists before deletion processing'
);

set local role service_role;
select is(
  public.transition_safety_report(
    '16161616-aaaa-4aaa-8aaa-161616161611',
    'triaged'::public.safety_report_status,
    'initial_review',
    'test-safety-worker'
  ),
  true,
  'the report can carry moderation history before either account is deleted'
);
reset role;

select is(
  (select count(*)::integer from private.safety_report_events where report_id = '16161616-aaaa-4aaa-8aaa-161616161611'),
  1,
  'the moderation audit event exists before deletion'
);

update public.users
set account_status = 'deletion_pending'
where id = '16161616-1616-4616-8616-161616161612';

insert into public.deletion_requests (
  id,
  user_id,
  request_scope,
  status,
  requested_at,
  due_at,
  processing_started_at
) values (
  '16161616-bbbb-4bbb-8bbb-161616161612',
  '16161616-1616-4616-8616-161616161612',
  'entire_account',
  'in_progress',
  now() - interval '31 days',
  now() - interval '1 day',
  now()
);

set local role service_role;
select public.purge_account_private_data('16161616-1616-4616-8616-161616161612');
reset role;

select is(
  (select details from public.safety_reports where id = '16161616-aaaa-4aaa-8aaa-161616161611'),
  null,
  'deletion purge erases safety-report free text involving the deleting member'
);

delete from auth.users
where id = '16161616-1616-4616-8616-161616161612';

select is(
  (select count(*)::integer from public.safety_reports where id = '16161616-aaaa-4aaa-8aaa-161616161611'),
  1,
  'deleting the reported account preserves the structured safety audit record'
);

select is(
  (select target_user_id from public.safety_reports where id = '16161616-aaaa-4aaa-8aaa-161616161611'),
  null,
  'the deleted target identity link is removed from the retained report'
);

select is(
  (
    select reporter_user_id
    from public.safety_reports
    where id = '16161616-aaaa-4aaa-8aaa-161616161611'
  ),
  '16161616-1616-4616-8616-161616161611'::uuid,
  'the active reporter link remains until that reporter deletes their own account'
);

select is(
  (select count(*)::integer from public.member_blocks),
  0,
  'pair-specific block rows are removed when the blocked account is deleted'
);

update public.users
set account_status = 'deletion_pending'
where id = '16161616-1616-4616-8616-161616161611';

insert into public.deletion_requests (
  id,
  user_id,
  request_scope,
  status,
  requested_at,
  due_at,
  processing_started_at
) values (
  '16161616-cccc-4ccc-8ccc-161616161611',
  '16161616-1616-4616-8616-161616161611',
  'entire_account',
  'in_progress',
  now() - interval '31 days',
  now() - interval '1 day',
  now()
);

set local role service_role;
select public.purge_account_private_data('16161616-1616-4616-8616-161616161611');
reset role;

delete from auth.users
where id = '16161616-1616-4616-8616-161616161611';

select is(
  (select count(*)::integer from public.safety_reports where id = '16161616-aaaa-4aaa-8aaa-161616161611'),
  1,
  'the anonymized structured report remains after both member accounts are deleted'
);

select is(
  (select reporter_user_id from public.safety_reports where id = '16161616-aaaa-4aaa-8aaa-161616161611'),
  null,
  'the deleting reporter identity link is removed'
);

select ok(
  exists (
    select 1
    from public.safety_reports
    where id = '16161616-aaaa-4aaa-8aaa-161616161611'
      and reporter_user_id is null
      and target_user_id is null
      and details is null
      and status = 'triaged'
  ),
  'retained safety data is structured and no longer linked to either deleted member'
);

select is(
  (select count(*)::integer from private.safety_report_events where report_id = '16161616-aaaa-4aaa-8aaa-161616161611'),
  1,
  'non-identifying moderation transition history remains attached to the retained report'
);

select * from finish();
rollback;
