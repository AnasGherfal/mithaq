begin;
select plan(2);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.prosecdef
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) config
        where config like 'search_path=%'
      )
  ),
  0,
  'every private SECURITY DEFINER function pins its search_path'
);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and pg_get_userbyid(p.proowner) = current_user
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) config
        where config like 'search_path=%'
      )
  ),
  0,
  'application-owned public SECURITY DEFINER functions pin their search_path'
);

select * from finish();
rollback;
