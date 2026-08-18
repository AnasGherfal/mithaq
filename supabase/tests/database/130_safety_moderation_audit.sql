begin;
select plan(12);

select is(
  has_function_privilege(
    'authenticated',
    'public.transition_safety_report(uuid, public.safety_report_status, text, text)',
    'EXECUTE'
  ),
  false,
  'members cannot transition moderation state'
);

select is(
  has_function_privilege(
    'service_role',
    'public.transition_safety_report(uuid, public.safety_report_status, text, text)',
    'EXECUTE'
  ),
  true,
  'trusted moderation services can transition safety reports'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2')
on conflict (id) do nothing;

insert into public.safety_reports (
  id,
  reporter_user_id,
  target_user_id,
  category,
  details
) values (
  'dddddddd-1111-4111-8111-dddddddddddd',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
  'safety_concern',
  'A moderation state-machine test report.'
);

select is(
  public.transition_safety_report(
    'dddddddd-1111-4111-8111-dddddddddddd',
    'triaged'::public.safety_report_status,
    'initial_review',
    'test-moderator'
  ),
  true,
  'a submitted report can move to triaged'
);

select is(
  (select status from public.safety_reports where id = 'dddddddd-1111-4111-8111-dddddddddddd'),
  'triaged'::public.safety_report_status,
  'the report stores the triaged state'
);

select is(
  (select count(*)::integer from private.safety_report_events where report_id = 'dddddddd-1111-4111-8111-dddddddddddd'),
  1,
  'the first moderation transition is audited'
);

select is(
  (
    select row(from_status, to_status, note_code, actor_reference)::text
    from private.safety_report_events
    where report_id = 'dddddddd-1111-4111-8111-dddddddddddd'
  ),
  '(submitted,triaged,initial_review,test-moderator)',
  'the audit event records the state change and actor reference'
);

select throws_ok(
  $$select public.transition_safety_report(
    'dddddddd-1111-4111-8111-dddddddddddd',
    'submitted'::public.safety_report_status,
    null,
    'test-moderator'
  )$$,
  'P0001',
  'invalid moderation transition',
  'moderation cannot move a report backward to submitted'
);

select is(
  public.transition_safety_report(
    'dddddddd-1111-4111-8111-dddddddddddd',
    'investigating'::public.safety_report_status,
    null,
    'test-moderator'
  ),
  true,
  'triaged reports can move into investigation'
);

select is(
  public.transition_safety_report(
    'dddddddd-1111-4111-8111-dddddddddddd',
    'actioned'::public.safety_report_status,
    'safety_action_taken',
    'test-moderator'
  ),
  true,
  'investigating reports can move to actioned'
);

select is(
  public.transition_safety_report(
    'dddddddd-1111-4111-8111-dddddddddddd',
    'closed'::public.safety_report_status,
    'case_complete',
    'test-moderator'
  ),
  true,
  'actioned reports can be closed'
);

select throws_ok(
  $$select public.transition_safety_report(
    'dddddddd-1111-4111-8111-dddddddddddd',
    'triaged'::public.safety_report_status,
    null,
    'test-moderator'
  )$$,
  'P0001',
  'invalid moderation transition',
  'closed reports cannot be reopened through the standard transition RPC'
);

select is(
  (select count(*)::integer from private.safety_report_events where report_id = 'dddddddd-1111-4111-8111-dddddddddddd'),
  4,
  'only valid moderation transitions create audit events'
);

reset role;
select * from finish();
rollback;
