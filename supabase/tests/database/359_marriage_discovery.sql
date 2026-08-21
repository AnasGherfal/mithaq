begin;
select plan(6);

select is(
  has_table_privilege('authenticated', 'private.marriage_discovery_actions', 'SELECT'),
  false,
  'members cannot inspect raw Marriage discovery actions'
);

select is(
  has_table_privilege('authenticated', 'private.marriage_discovery_actions', 'INSERT'),
  false,
  'members cannot write Marriage discovery actions directly'
);

select is(
  has_function_privilege('authenticated', 'public.list_marriage_discovery(integer)', 'EXECUTE'),
  true,
  'authenticated members can use guarded Marriage discovery'
);

select is(
  has_function_privilege('authenticated', 'public.record_marriage_discovery_action(uuid, public.marriage_discovery_action)', 'EXECUTE'),
  true,
  'authenticated members can record guarded private Marriage discovery actions'
);

select is(
  has_function_privilege('anon', 'public.list_marriage_discovery(integer)', 'EXECUTE'),
  false,
  'anonymous users cannot browse Marriage discovery'
);

select is(
  has_function_privilege('anon', 'public.record_marriage_discovery_action(uuid, public.marriage_discovery_action)', 'EXECUTE'),
  false,
  'anonymous users cannot create Marriage discovery signals'
);

select * from finish();
rollback;
