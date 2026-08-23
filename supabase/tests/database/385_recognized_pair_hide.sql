begin;
select plan(8);

select ok(
  to_regprocedure('public.hide_recognized_introduction_member(uuid)') is not null,
  'introduction-scoped recognized-person hide RPC exists'
);

select is(
  has_function_privilege('authenticated', 'public.hide_recognized_introduction_member(uuid)', 'EXECUTE'),
  true,
  'authenticated members can use the guarded recognized-person hide RPC'
);

select is(
  has_function_privilege('anon', 'public.hide_recognized_introduction_member(uuid)', 'EXECUTE'),
  false,
  'anonymous callers cannot use the recognized-person hide RPC'
);

select is(
  has_function_privilege('authenticated', 'private.close_active_pair_for_recognition_hide(uuid,uuid,uuid)', 'EXECUTE'),
  false,
  'members cannot call the private pair-closing helper directly'
);

select ok(
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname = 'private'
      and c.relname = 'marriage_discovery_hides'
      and t.tgname = 'marriage_discovery_hide_closes_active_pair'
  ),
  'discovery hides close already-active Marriage relationships'
);

select ok(
  position(
    'recognized-pair-hide' in
    pg_get_functiondef('private.close_active_pair_for_recognition_hide(uuid,uuid,uuid)'::regprocedure)
  ) > 0,
  'recognized pair closure is separately auditable without exposing the reason to members'
);

select ok(
  position(
    'private.marriage_discovery_hides' in
    pg_get_functiondef('public.hide_recognized_introduction_member(uuid)'::regprocedure)
  ) > 0,
  'introduction-scoped RPC uses the same reciprocal pair-hide primitive as Discover'
);

select ok(
  position(
    'private.close_active_pair_for_recognition_hide' in
    pg_get_functiondef('public.hide_recognized_introduction_member(uuid)'::regprocedure)
  ) > 0,
  'introduction-scoped hide closes stale active introductions even when the hide already existed'
);

select * from finish();
rollback;
