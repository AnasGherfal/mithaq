begin;
select plan(5);

select is(
  has_function_privilege(
    'authenticated',
    'public.resolve_introduction_photo_path_for_service(uuid,uuid,uuid)',
    'EXECUTE'
  ),
  false,
  'members cannot resolve another member photo storage path directly'
);

select is(
  has_function_privilege(
    'anon',
    'public.resolve_introduction_photo_path_for_service(uuid,uuid,uuid)',
    'EXECUTE'
  ),
  false,
  'anonymous callers cannot resolve introduction photo storage paths'
);

select is(
  has_function_privilege(
    'service_role',
    'public.resolve_introduction_photo_path_for_service(uuid,uuid,uuid)',
    'EXECUTE'
  ),
  true,
  'the authenticated photo delivery service can resolve an eligible path'
);

select ok(
  pg_get_functiondef(
    'public.resolve_introduction_photo_path_for_service(uuid,uuid,uuid)'::regprocedure
  ) like '%introduction_member_photo_is_revealed%',
  'the resolver requires the target member photo to be revealed for this introduction'
);

select ok(
  pg_get_functiondef(
    'public.resolve_introduction_photo_path_for_service(uuid,uuid,uuid)'::regprocedure
  ) like '%marriage_pair_is_hidden%',
  'the resolver respects blocking and Family Shield privacy boundaries'
);

select * from finish();
rollback;
