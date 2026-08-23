begin;
select plan(24);

select is(
  has_table_privilege('authenticated', 'public.member_connection_spaces', 'SELECT'),
  true,
  'members can read their own connection-space memberships through RLS'
);

select is(
  has_table_privilege('authenticated', 'public.member_connection_spaces', 'INSERT'),
  false,
  'members cannot insert connection-space memberships directly'
);

select is(
  has_table_privilege('authenticated', 'public.member_connection_spaces', 'UPDATE'),
  false,
  'members cannot update connection-space memberships directly'
);

select is(
  has_table_privilege('authenticated', 'public.friendship_profiles', 'SELECT'),
  true,
  'members can read their own friendship profile through RLS'
);

select is(
  has_table_privilege('authenticated', 'public.friendship_profiles', 'INSERT'),
  false,
  'members cannot insert friendship profiles directly'
);

select is(
  has_function_privilege('anon', 'public.list_my_connection_spaces()', 'EXECUTE'),
  false,
  'anonymous users cannot inspect connection spaces'
);

select is(
  has_function_privilege(
    'anon',
    'public.save_my_friendship_profile(text,text,text,text[])',
    'EXECUTE'
  ),
  false,
  'anonymous users cannot save friendship profiles'
);

select is(
  has_function_privilege('authenticated', 'public.list_my_connection_spaces()', 'EXECUTE'),
  true,
  'authenticated members can list their own connection spaces'
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
    '54545454-5454-4545-8545-545454545451',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '54545454-5454-4545-8545-545454545452',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '54545454-5454-4545-8545-545454545453',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('54545454-5454-4545-8545-545454545451'),
  ('54545454-5454-4545-8545-545454545452'),
  ('54545454-5454-4545-8545-545454545453')
on conflict (id) do nothing;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '54545454-5454-4545-8545-545454545451',
  true
);

select is(
  (select count(*)::integer from public.list_my_connection_spaces()),
  2,
  'the selector always returns the two explicit product spaces'
);

select is(
  (
    select count(*)::integer
    from public.list_my_connection_spaces()
    where membership_state is not null
  ),
  0,
  'a newly verified account is not silently enrolled in either space'
);

select is(
  public.join_my_connection_space('marriage'::public.connection_space),
  true,
  'a member can explicitly join the marriage space'
);

select is(
  (
    select is_current
    from public.list_my_connection_spaces()
    where space = 'marriage'::public.connection_space
  ),
  true,
  'the first joined space becomes the current space'
);

select is(
  public.join_my_connection_space('friendship'::public.connection_space),
  true,
  'the same account can separately join the friendship space'
);

select is(
  (
    select count(*)::integer
    from public.list_my_connection_spaces()
    where membership_state = 'active'::public.connection_space_membership_state
  ),
  2,
  'both spaces can be active memberships without combining their profiles'
);

select is(
  public.set_my_current_connection_space('friendship'::public.connection_space),
  true,
  'a member can switch the current app space explicitly'
);

select is(
  (
    select count(*)::integer
    from public.list_my_connection_spaces()
    where is_current
      and space = 'friendship'::public.connection_space
  ),
  1,
  'only the friendship space is current after the switch'
);

select is(
  (
    select profile_completed
    from public.save_my_friendship_profile(
      'Nour',
      'Short introduction',
      'Tripoli',
      array['Coffee']
    )
  ),
  false,
  'a friendship profile can be saved as a private draft'
);

select is(
  (
    select profile_completed
    from public.save_my_friendship_profile(
      'Nour',
      'I enjoy thoughtful conversations, discovering new cafés, books, and meeting kind people around shared interests.',
      'Tripoli',
      array['Coffee', 'coffee', 'Books']
    )
  ),
  true,
  'a complete friendship profile is tracked independently'
);

select is(
  (
    select cardinality(interests)
    from public.get_my_friendship_profile()
  ),
  2,
  'friendship interests are normalized without duplicate labels'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '54545454-5454-4545-8545-545454545452',
  true
);

select is(
  (
    select count(*)::integer
    from public.member_connection_spaces
    where user_id = '54545454-5454-4545-8545-545454545451'
  ),
  0,
  'another member cannot inspect connection-space memberships'
);

select is(
  (
    select count(*)::integer
    from public.friendship_profiles
    where user_id = '54545454-5454-4545-8545-545454545451'
  ),
  0,
  'another member cannot inspect a friendship profile'
);

select throws_ok(
  $$select public.set_my_current_connection_space('friendship'::public.connection_space)$$,
  'P0001',
  'connection space unavailable',
  'a member cannot switch into a space they have not joined'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '54545454-5454-4545-8545-545454545453',
  true
);
select public.join_my_connection_space('friendship'::public.connection_space);

reset role;
update public.users
set account_status = 'deletion_pending'
where id = '54545454-5454-4545-8545-545454545453';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '54545454-5454-4545-8545-545454545453',
  true
);

select throws_ok(
  $$select public.join_my_connection_space('marriage'::public.connection_space)$$,
  'P0001',
  'account unavailable',
  'a deletion-pending account cannot join another space'
);

select throws_ok(
  $$select * from public.save_my_friendship_profile(
    'Member',
    'This friendship profile should not accept new personal data while account deletion is pending.',
    'Tripoli',
    array['Books', 'Coffee']
  )$$,
  'P0001',
  'account unavailable',
  'a deletion-pending account cannot save friendship profile data'
);

reset role;
select * from finish();
rollback;
