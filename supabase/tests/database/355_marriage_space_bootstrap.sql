begin;
select plan(5);

select is(
  has_function_privilege(
    'authenticated',
    'private.ensure_marriage_connection_space()',
    'EXECUTE'
  ),
  false,
  'members cannot invoke the marriage bootstrap trigger directly'
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
    '55545454-5454-4545-8545-545454545451',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '55545454-5454-4545-8545-545454545452',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('55545454-5454-4545-8545-545454545451'),
  ('55545454-5454-4545-8545-545454545452')
on conflict (id) do nothing;

select is(
  (
    select count(*)::integer
    from public.member_connection_spaces
    where user_id = '55545454-5454-4545-8545-545454545451'
  ),
  0,
  'phone verification alone does not silently enroll a new account'
);

insert into public.waitlist_applications (
  id,
  user_id,
  status,
  started_at
) values (
  '55545454-aaaa-4aaa-8aaa-555454545451',
  '55545454-5454-4545-8545-545454545451',
  'draft',
  now()
);

select is(
  (
    select count(*)::integer
    from public.member_connection_spaces
    where user_id = '55545454-5454-4545-8545-545454545451'
      and space = 'marriage'::public.connection_space
      and membership_state = 'active'::public.connection_space_membership_state
  ),
  1,
  'starting marriage onboarding creates an active Marriage membership'
);

select is(
  (
    select is_current
    from public.member_connection_spaces
    where user_id = '55545454-5454-4545-8545-545454545451'
      and space = 'marriage'::public.connection_space
  ),
  true,
  'Marriage becomes current when it is the first joined space'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '55545454-5454-4545-8545-545454545452',
  true
);
select public.join_my_connection_space('friendship'::public.connection_space);
reset role;

insert into public.waitlist_applications (
  id,
  user_id,
  status,
  started_at
) values (
  '55545454-bbbb-4bbb-8bbb-555454545452',
  '55545454-5454-4545-8545-545454545452',
  'draft',
  now()
);

select is(
  (
    select count(*)::integer
    from public.member_connection_spaces
    where user_id = '55545454-5454-4545-8545-545454545452'
      and is_current
      and space = 'friendship'::public.connection_space
  ),
  1,
  'starting marriage onboarding does not switch away from a current Friends space'
);

select * from finish();
rollback;
