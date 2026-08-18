begin;
select plan(11);

select is(
  has_table_privilege('authenticated', 'public.member_profiles', 'SELECT'),
  true,
  'members can read their own private profile through RLS'
);

select is(
  has_table_privilege('authenticated', 'public.member_profiles', 'INSERT'),
  false,
  'clients cannot insert member profiles directly'
);

select is(
  has_table_privilege('authenticated', 'public.member_profiles', 'UPDATE'),
  false,
  'clients cannot update member profiles directly'
);

select is(
  has_table_privilege('authenticated', 'public.member_profiles', 'DELETE'),
  false,
  'clients cannot delete member profiles directly'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.save_member_profile(text,text,text,text)',
    'EXECUTE'
  ),
  true,
  'authenticated members can use the guarded profile save function'
);

select is(
  has_function_privilege(
    'anon',
    'public.save_member_profile(text,text,text,text)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot call the member profile save function'
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
    '55555555-5555-4555-8555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('55555555-5555-4555-8555-555555555555'),
  ('66666666-6666-4666-8666-666666666666')
on conflict (id) do nothing;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '55555555-5555-4555-8555-555555555555',
  true
);

select is(
  (
    select profile_completed
    from public.save_member_profile(
      'Anas',
      'Short introduction',
      'Founder',
      'University'
    )
  ),
  false,
  'a short biography saves as an incomplete profile'
);

select is(
  (
    select profile_completed
    from public.save_member_profile(
      'Anas',
      'I value family, respect, responsibility, and building a serious marriage with clear intentions.',
      'Founder',
      'University'
    )
  ),
  true,
  'a matching-ready private profile becomes complete'
);

select is(
  (
    select count(*)::integer
    from public.member_profiles
    where user_id = auth.uid()
      and profile_completed_at is not null
  ),
  1,
  'the member can read the completed profile they own'
);

select set_config(
  'request.jwt.claim.sub',
  '66666666-6666-4666-8666-666666666666',
  true
);

select is(
  (
    select count(*)::integer
    from public.member_profiles
    where user_id = '55555555-5555-4555-8555-555555555555'
  ),
  0,
  'another authenticated member cannot browse someone else profile'
);

reset role;

update public.users
set account_status = 'deletion_pending'
where id = '66666666-6666-4666-8666-666666666666';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '66666666-6666-4666-8666-666666666666',
  true
);

select throws_ok(
  $$select * from public.save_member_profile(
    'Sara',
    'I am intentionally trying to save personal data while deletion is pending.',
    null,
    null
  )$$,
  'P0001',
  'account unavailable',
  'deletion-pending accounts cannot add or change profile data'
);

reset role;
select * from finish();
rollback;
