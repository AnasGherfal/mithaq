begin;
select plan(9);

select is(
  (select column_default
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'marriage_visibility_settings'
     and column_name = 'visibility_mode'),
  '''private''::marriage_visibility_mode',
  'new Marriage visibility settings remain private-first by default'
);

select is(
  (select count(*)
   from public.marriage_visibility_settings
   where visibility_mode <> 'private'::public.marriage_visibility_mode),
  0::bigint,
  'the migration does not silently opt existing members into open profiles'
);

select is(
  has_function_privilege('authenticated', 'public.get_my_marriage_visibility()', 'EXECUTE'),
  true,
  'authenticated members can read their own presentation choice'
);

select is(
  has_function_privilege('authenticated', 'public.set_my_marriage_visibility(public.marriage_visibility_mode)', 'EXECUTE'),
  true,
  'authenticated members can change their own presentation choice'
);

select is(
  has_function_privilege('anon', 'public.get_my_marriage_visibility()', 'EXECUTE'),
  false,
  'anonymous callers cannot inspect a member presentation choice'
);

select is(
  has_function_privilege('anon', 'public.set_my_marriage_visibility(public.marriage_visibility_mode)', 'EXECUTE'),
  false,
  'anonymous callers cannot change a presentation choice'
);

select is(
  has_function_privilege('authenticated', 'public.resolve_marriage_discovery_photo_path_for_service(uuid,uuid,uuid)', 'EXECUTE'),
  false,
  'members cannot resolve another member photo storage path directly'
);

select is(
  has_function_privilege('service_role', 'public.resolve_marriage_discovery_photo_path_for_service(uuid,uuid,uuid)', 'EXECUTE'),
  true,
  'only the service photo endpoint can resolve eligible Discover photo paths'
);

select ok(
  position(
    'visibility_mode' in pg_get_functiondef(
      'public.resolve_marriage_discovery_photo_path_for_service(uuid,uuid,uuid)'::regprocedure
    )
  ) > 0,
  'Discover photo resolution explicitly checks the member presentation choice'
);

select * from finish();
rollback;
