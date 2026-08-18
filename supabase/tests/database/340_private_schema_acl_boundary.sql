begin;
select plan(8);

select is(
  has_schema_privilege('anon', 'private', 'USAGE'),
  false,
  'anonymous clients cannot use the private schema'
);

select is(
  has_schema_privilege('authenticated', 'private', 'USAGE'),
  false,
  'authenticated clients cannot use the private schema directly'
);

select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private'
      and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and (
        has_table_privilege('anon', c.oid, 'SELECT')
        or has_table_privilege('anon', c.oid, 'INSERT')
        or has_table_privilege('anon', c.oid, 'UPDATE')
        or has_table_privilege('anon', c.oid, 'DELETE')
      )
  ),
  0,
  'anonymous clients have no direct private relation privileges'
);

select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private'
      and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and (
        has_table_privilege('authenticated', c.oid, 'SELECT')
        or has_table_privilege('authenticated', c.oid, 'INSERT')
        or has_table_privilege('authenticated', c.oid, 'UPDATE')
        or has_table_privilege('authenticated', c.oid, 'DELETE')
      )
  ),
  0,
  'authenticated clients have no direct private relation privileges'
);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ),
  0,
  'anonymous clients cannot execute private helper functions'
);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  0,
  'authenticated clients cannot execute private helper functions'
);

select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private'
      and c.relkind = 'S'
      and (
        has_sequence_privilege('anon', c.oid, 'USAGE')
        or has_sequence_privilege('anon', c.oid, 'SELECT')
        or has_sequence_privilege('anon', c.oid, 'UPDATE')
      )
  ),
  0,
  'anonymous clients have no direct private sequence privileges'
);

select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private'
      and c.relkind = 'S'
      and (
        has_sequence_privilege('authenticated', c.oid, 'USAGE')
        or has_sequence_privilege('authenticated', c.oid, 'SELECT')
        or has_sequence_privilege('authenticated', c.oid, 'UPDATE')
      )
  ),
  0,
  'authenticated clients have no direct private sequence privileges'
);

select * from finish();
rollback;
