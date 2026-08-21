begin;
select plan(10);

select is(
  has_table_privilege('authenticated', 'private.marriage_family_shield', 'SELECT'),
  false,
  'members cannot inspect raw Family Shield hashes'
);

select is(
  has_table_privilege('authenticated', 'private.marriage_phone_shield_secret', 'SELECT'),
  false,
  'members cannot read the Family Shield pepper'
);

select is(
  has_function_privilege('authenticated', 'public.add_my_marriage_family_shield(text)', 'EXECUTE'),
  true,
  'authenticated members can add a protected phone exclusion'
);

select is(
  has_function_privilege('authenticated', 'public.list_my_marriage_family_shield()', 'EXECUTE'),
  true,
  'authenticated members can list only their masked exclusions'
);

select is(
  has_function_privilege('authenticated', 'public.remove_my_marriage_family_shield(uuid)', 'EXECUTE'),
  true,
  'authenticated members can remove their own exclusion'
);

select is(
  has_function_privilege('anon', 'public.add_my_marriage_family_shield(text)', 'EXECUTE'),
  false,
  'anonymous users cannot add Family Shield exclusions'
);

select is(
  has_function_privilege('authenticated', 'private.marriage_phone_hash(text)', 'EXECUTE'),
  false,
  'members cannot call the private phone hashing helper'
);

select is(
  has_function_privilege('authenticated', 'private.marriage_pair_is_phone_shielded(uuid, uuid)', 'EXECUTE'),
  false,
  'members cannot probe whether two accounts are shielded'
);

select is(
  has_function_privilege('authenticated', 'public.list_marriage_discovery(integer)', 'EXECUTE'),
  true,
  'authenticated members can use guarded anonymous Marriage discovery'
);

select is(
  has_function_privilege('anon', 'public.list_marriage_discovery(integer)', 'EXECUTE'),
  false,
  'anonymous users cannot use Marriage discovery'
);

select * from finish();
rollback;
