begin;
select plan(10);

select is(
  has_table_privilege('authenticated', 'private.marriage_practical_priorities', 'SELECT'),
  false,
  'members cannot inspect raw Marriage priorities'
);

select is(
  has_function_privilege('authenticated', 'public.get_my_marriage_practical_priorities()', 'EXECUTE'),
  true,
  'authenticated members can read their guarded Marriage priorities'
);

select is(
  has_function_privilege('authenticated', 'public.save_my_marriage_practical_priorities(text, text, text, text)', 'EXECUTE'),
  true,
  'authenticated members can save their guarded Marriage priorities'
);

select is(
  has_function_privilege('anon', 'public.get_my_marriage_practical_priorities()', 'EXECUTE'),
  false,
  'anonymous users cannot read Marriage priorities'
);

select ok(
  'married' = any(enum_range(null::public.marital_status)::text[]),
  'married is a supported marital status'
);

select is(
  (select min(min_age)::integer from public.age_bands),
  18,
  'Mithaq age bands remain 18 plus'
);

insert into auth.users (
  id, instance_id, aud, role, created_at, updated_at
) values (
  '61616161-6161-4616-8616-616161616161',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  now(),
  now()
) on conflict (id) do nothing;

insert into public.users (id)
values ('61616161-6161-4616-8616-616161616161')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub','61616161-6161-4616-8616-616161616161',true);
select public.join_my_connection_space('marriage'::public.connection_space);

select * from public.save_my_marriage_practical_priorities(
  'independent_home',
  'want_children',
  'open_to_discuss',
  'simple'
);

select is(
  (select living_arrangement from public.get_my_marriage_practical_priorities()),
  'independent_home',
  'member reads back only their living arrangement'
);

select is(
  (select children_plan from public.get_my_marriage_practical_priorities()),
  'want_children',
  'member reads back their children plan'
);

select is(
  (select work_after_marriage from public.get_my_marriage_practical_priorities()),
  'open_to_discuss',
  'member reads back their work expectation'
);

select is(
  (select wedding_style from public.get_my_marriage_practical_priorities()),
  'simple',
  'member reads back their wedding expectation'
);

reset role;
select * from finish();
rollback;
