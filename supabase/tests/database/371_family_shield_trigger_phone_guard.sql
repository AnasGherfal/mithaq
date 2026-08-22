begin;
select plan(4);

select ok(
  position('when au.phone ~' in pg_get_functiondef('private.close_active_pair_after_family_shield()'::regprocedure)) > 0,
  'Family Shield close trigger validates candidate auth phone format before hashing'
);

select is(
  has_function_privilege('authenticated', 'private.close_active_pair_after_family_shield()', 'EXECUTE'),
  false,
  'members cannot call the Family Shield trigger function'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'private.marriage_family_shield'::regclass
      and tgname = 'marriage_family_shield_closes_active_pair'
      and not tgisinternal
  ),
  'Family Shield active-pair trigger remains installed'
);

select is(
  has_table_privilege('authenticated', 'private.marriage_family_shield', 'SELECT'),
  false,
  'members still cannot inspect Family Shield hashes'
);

select * from finish();
rollback;
