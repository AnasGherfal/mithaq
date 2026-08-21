begin;
select plan(11);

select ok(
  exists (
    select 1
    from unnest(enum_range(null::public.photo_privacy_preference)) value
    where value::text = 'discovery_visible'
  ),
  'members can opt in to approved-photo visibility in Marriage Discover'
);

select is(
  has_function_privilege('authenticated', 'public.list_marriage_discovery(integer)', 'EXECUTE'),
  true,
  'authenticated members can use guarded Marriage Discover v2'
);

select is(
  has_function_privilege('anon', 'public.list_marriage_discovery(integer)', 'EXECUTE'),
  false,
  'anonymous users cannot browse Marriage Discover'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.resolve_marriage_discovery_photo_path_for_service(uuid, uuid, uuid)',
    'EXECUTE'
  ),
  false,
  'members cannot resolve another member photo storage path directly'
);

select is(
  has_function_privilege(
    'service_role',
    'public.resolve_marriage_discovery_photo_path_for_service(uuid, uuid, uuid)',
    'EXECUTE'
  ),
  true,
  'only the service layer can resolve an authorized discovery photo path'
);

select is(
  has_function_privilege(
    'authenticated',
    'private.marriage_practical_alignment_reasons(uuid, uuid)',
    'EXECUTE'
  ),
  false,
  'members cannot query private practical-priority comparisons directly'
);

select ok(
  pg_get_function_result('public.list_marriage_discovery(integer)'::regprocedure)
    like '%photo_display_mode text%',
  'Marriage Discover returns a disclosure mode instead of a storage path'
);

select ok(
  pg_get_function_result('public.list_marriage_discovery(integer)'::regprocedure)
    like '%alignment_reasons text[]%',
  'Marriage Discover returns factual alignment reason codes'
);

insert into auth.users (
  id, instance_id, aud, role, created_at, updated_at
) values
  ('62626262-6262-4626-8626-626262626261','00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now()),
  ('62626262-6262-4626-8626-626262626262','00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now())
on conflict (id) do nothing;

insert into public.users (id)
values
  ('62626262-6262-4626-8626-626262626261'),
  ('62626262-6262-4626-8626-626262626262')
on conflict (id) do nothing;

insert into private.marriage_practical_priorities (
  user_id,
  living_arrangement,
  children_plan,
  work_after_marriage,
  wedding_style
) values
  ('62626262-6262-4626-8626-626262626261','independent_home','want_children','both_work','simple'),
  ('62626262-6262-4626-8626-626262626262','independent_home','want_children','open_to_discuss','simple')
on conflict (user_id) do update
set living_arrangement = excluded.living_arrangement,
    children_plan = excluded.children_plan,
    work_after_marriage = excluded.work_after_marriage,
    wedding_style = excluded.wedding_style;

select is(
  cardinality(private.marriage_practical_alignment_reasons(
    '62626262-6262-4626-8626-626262626261',
    '62626262-6262-4626-8626-626262626262'
  )),
  3,
  'practical alignment counts only matching priority categories'
);

select ok(
  'living_arrangement' = any(private.marriage_practical_alignment_reasons(
    '62626262-6262-4626-8626-626262626261',
    '62626262-6262-4626-8626-626262626262'
  )),
  'living arrangement can contribute a factual alignment reason'
);

select ok(
  not ('work_after_marriage' = any(private.marriage_practical_alignment_reasons(
    '62626262-6262-4626-8626-626262626261',
    '62626262-6262-4626-8626-626262626262'
  ))),
  'different work expectations are not falsely presented as alignment'
);

select * from finish();
rollback;
