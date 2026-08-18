begin;
select plan(5);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3')
on conflict (id) do nothing;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  true
);

select ok(
  public.submit_safety_report(
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    'harassment'::public.safety_report_category,
    'A first safety report.',
    false
  ) is not null,
  'the first safety report is accepted'
);

select throws_ok(
  $$select public.submit_safety_report(
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    'harassment'::public.safety_report_category,
    'A duplicate report immediately afterward.',
    false
  )$$,
  'P0001',
  'report recently submitted',
  'rapid duplicate reports for the same target and category are rejected'
);

select is(
  (select count(*)::integer from public.safety_reports),
  1,
  'the rejected duplicate does not create another report'
);

reset role;

insert into public.safety_reports (
  reporter_user_id,
  target_user_id,
  category,
  details,
  reported_at,
  status_updated_at
)
select
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
  'other'::public.safety_report_category,
  'Seeded historical safety report ' || sequence_number,
  now() - interval '30 minutes' - (sequence_number * interval '1 minute'),
  now() - interval '30 minutes' - (sequence_number * interval '1 minute')
from generate_series(1, 10) as sequence_number;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
  true
);

select throws_ok(
  $$select public.submit_safety_report(
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    'safety_concern'::public.safety_report_category,
    'This should be stopped by the daily abuse limit.',
    false
  )$$,
  'P0001',
  'report rate limit reached',
  'a member cannot create more than ten safety reports within 24 hours'
);

select is(
  (select count(*)::integer from public.safety_reports),
  10,
  'the daily-limit rejection creates no additional report for that reporter'
);

reset role;
select * from finish();
rollback;
