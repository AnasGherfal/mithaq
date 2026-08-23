begin;
select plan(8);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prosecdef
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) cfg
        where cfg like 'search_path=%'
      )
  ),
  0,
  'every application SECURITY DEFINER function pins search_path'
);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges
    where table_schema = 'private'
      and grantee in ('anon', 'authenticated')
  ),
  0,
  'member and anonymous roles have no direct private-schema table privileges'
);

select is(
  has_function_privilege('authenticated', 'public.create_controlled_introduction(uuid,uuid,timestamptz,text)', 'EXECUTE'),
  false,
  'members cannot create controlled introductions through the service RPC'
);

select is(
  has_function_privilege('authenticated', 'public.resolve_introduction_photo_path_for_service(uuid,uuid,uuid)', 'EXECUTE'),
  false,
  'members cannot resolve private introduction photo storage paths'
);

select is(
  has_function_privilege('authenticated', 'public.set_member_identity_trust_for_service(uuid,text,boolean,text)', 'EXECUTE'),
  false,
  'members cannot award themselves identity trust states'
);

select is(
  has_function_privilege('authenticated', 'public.set_member_safety_state(uuid,public.member_safety_state,text,text,timestamptz)', 'EXECUTE'),
  false,
  'members cannot directly mutate moderation safety state'
);

select is(
  has_function_privilege('authenticated', 'public.review_member_photo(uuid,public.member_photo_review_state,timestamptz,text)', 'EXECUTE'),
  false,
  'members cannot directly approve their own photos'
);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like '%friendship%'
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  0,
  'Marriage-only launch keeps every Friendship RPC unavailable to members'
);

select * from finish();
rollback;
