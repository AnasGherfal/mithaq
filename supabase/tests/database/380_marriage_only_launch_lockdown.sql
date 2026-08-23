begin;
select plan(7);

select is(
  has_table_privilege('authenticated', 'public.friendship_profiles', 'SELECT'),
  false,
  'authenticated clients cannot read dormant Friendship profiles'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname ilike '%friendship%'
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'authenticated clients cannot execute any Friendship RPC'
);

select ok(
  position('''marriage''::public.connection_space' in pg_get_functiondef('public.list_my_connection_spaces()'::regprocedure)) > 0,
  'connection-space listing is scoped to Marriage'
);

select ok(
  position('p_space is distinct from ''marriage''' in pg_get_functiondef('public.join_my_connection_space(public.connection_space)'::regprocedure)) > 0,
  'joining a connection space rejects Friendship at launch'
);

select ok(
  position('p_space is distinct from ''marriage''' in pg_get_functiondef('public.set_my_current_connection_space(public.connection_space)'::regprocedure)) > 0,
  'switching current space rejects Friendship at launch'
);

select is(
  (select count(*)::bigint from public.member_connection_spaces where space = 'friendship'::public.connection_space and membership_state = 'active'::public.connection_space_membership_state),
  0::bigint,
  'no Friendship membership remains active after launch lockdown'
);

select is(
  (select count(*)::bigint from public.member_connection_spaces where space = 'friendship'::public.connection_space and is_current),
  0::bigint,
  'no Friendship membership remains current after launch lockdown'
);

select * from finish();
rollback;
