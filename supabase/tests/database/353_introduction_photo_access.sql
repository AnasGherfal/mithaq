begin;
select plan(14);

select is(
  has_function_privilege(
    'authenticated',
    'public.list_introduction_photo_refs(uuid)',
    'EXECUTE'
  ),
  true,
  'members can list opaque approved photo references through the guarded RPC'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.resolve_introduction_photo_path_for_service(uuid,uuid,uuid)',
    'EXECUTE'
  ),
  false,
  'members cannot resolve private storage paths directly'
);

select is(
  has_function_privilege(
    'service_role',
    'public.resolve_introduction_photo_path_for_service(uuid,uuid,uuid)',
    'EXECUTE'
  ),
  true,
  'trusted delivery services can resolve an authorized private photo path'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values
  (
    '53535353-5353-4535-8535-535353535351',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '53535353-5353-4535-8535-535353535352',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '53535353-5353-4535-8535-535353535353',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into auth.sessions (id, user_id, created_at, updated_at)
values
  (
    '53535353-dddd-4ddd-8ddd-535353535351',
    '53535353-5353-4535-8535-535353535351',
    now(),
    now()
  ),
  (
    '53535353-dddd-4ddd-8ddd-535353535352',
    '53535353-5353-4535-8535-535353535352',
    now(),
    now()
  ),
  (
    '53535353-dddd-4ddd-8ddd-535353535353',
    '53535353-5353-4535-8535-535353535353',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('53535353-5353-4535-8535-535353535351'),
  ('53535353-5353-4535-8535-535353535352'),
  ('53535353-5353-4535-8535-535353535353')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id,
  user_id,
  status,
  gender,
  age_band_id,
  residency_type,
  current_country_code,
  current_city,
  marital_status,
  has_children,
  questionnaire_completed_at,
  submitted_at
) values
  (
    '53535353-aaaa-4aaa-8aaa-535353535351',
    '53535353-5353-4535-8535-535353535351',
    'submitted',
    'man',
    2,
    'libya',
    'LY',
    'Tripoli',
    'never_married',
    false,
    now(),
    now()
  ),
  (
    '53535353-bbbb-4bbb-8bbb-535353535352',
    '53535353-5353-4535-8535-535353535352',
    'submitted',
    'woman',
    2,
    'libya',
    'LY',
    'Benghazi',
    'never_married',
    false,
    now(),
    now()
  ),
  (
    '53535353-cccc-4ccc-8ccc-535353535353',
    '53535353-5353-4535-8535-535353535353',
    'submitted',
    'woman',
    3,
    'libya',
    'LY',
    'Misrata',
    'never_married',
    false,
    now(),
    now()
  );

insert into public.waitlist_preferences (
  application_id,
  open_to_libya,
  open_to_diaspora,
  preferred_partner_age_min,
  preferred_partner_age_max,
  accepts_partner_with_children,
  photo_privacy_preference
) values
  (
    '53535353-aaaa-4aaa-8aaa-535353535351',
    true,
    true,
    18,
    60,
    'depends',
    'after_mutual_interest'
  ),
  (
    '53535353-bbbb-4bbb-8bbb-535353535352',
    true,
    true,
    18,
    60,
    'depends',
    'after_mutual_interest'
  ),
  (
    '53535353-cccc-4ccc-8ccc-535353535353',
    true,
    true,
    18,
    60,
    'depends',
    'after_mutual_interest'
  );

insert into public.member_profiles (
  user_id,
  display_name,
  about_me,
  profile_completed_at
) values
  (
    '53535353-5353-4535-8535-535353535351',
    'Omar',
    'I value family, respect, responsibility, and a serious path toward marriage.',
    now()
  ),
  (
    '53535353-5353-4535-8535-535353535352',
    'Sara',
    'I value family, kindness, clarity, and building a peaceful marriage with intention.',
    now()
  ),
  (
    '53535353-5353-4535-8535-535353535353',
    'Mariam',
    'I value family, faith, respect, and a calm serious approach to marriage.',
    now()
  );

set local role service_role;

select public.set_member_profile_review_state(
  '53535353-5353-4535-8535-535353535351',
  'approved'::public.member_profile_review_state,
  'm11_photo_access',
  'm11-test',
  null
);
select public.set_member_profile_review_state(
  '53535353-5353-4535-8535-535353535352',
  'approved'::public.member_profile_review_state,
  'm11_photo_access',
  'm11-test',
  null
);
select public.set_member_profile_review_state(
  '53535353-5353-4535-8535-535353535353',
  'approved'::public.member_profile_review_state,
  'm11_photo_access',
  'm11-test',
  null
);

insert into storage.objects (bucket_id, name)
values
  (
    'member-profile-photos',
    '53535353-5353-4535-8535-535353535352/approved.jpg'
  ),
  (
    'member-profile-photos',
    '53535353-5353-4535-8535-535353535352/pending.jpg'
  );

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '53535353-5353-4535-8535-535353535352',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"53535353-5353-4535-8535-535353535352","session_id":"53535353-dddd-4ddd-8ddd-535353535352"}',
  true
);

create temporary table m11_photo_ids (
  name text primary key,
  id uuid not null
) on commit drop;
grant select on m11_photo_ids to authenticated, service_role;

insert into m11_photo_ids (name, id)
values
  (
    'approved',
    public.register_member_photo(
      '53535353-5353-4535-8535-535353535352/approved.jpg',
      1::smallint,
      true
    )
  ),
  (
    'pending',
    public.register_member_photo(
      '53535353-5353-4535-8535-535353535352/pending.jpg',
      2::smallint,
      false
    )
  );

reset role;
set local role service_role;

select public.review_member_photo(
  (select id from m11_photo_ids where name = 'approved'),
  'approved'::public.member_photo_review_state,
  null,
  'm11-test'
);

create temporary table m11_intro_ids (
  name text primary key,
  id uuid not null
) on commit drop;
grant select on m11_intro_ids to authenticated;

insert into m11_intro_ids (name, id)
select
  'mutual',
  public.create_controlled_introduction(
    '53535353-5353-4535-8535-535353535351',
    '53535353-5353-4535-8535-535353535352',
    clock_timestamp() + interval '7 days',
    'm11-test'
  );

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '53535353-5353-4535-8535-535353535351',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"53535353-5353-4535-8535-535353535351","session_id":"53535353-dddd-4ddd-8ddd-535353535351"}',
  true
);

select is(
  (
    select count(*)::integer
    from public.list_introduction_photo_refs(
      (select id from m11_intro_ids where name = 'mutual')
    )
  ),
  0,
  'counterpart photos remain hidden before mutual acceptance'
);

select is(
  public.respond_to_introduction(
    (select id from m11_intro_ids where name = 'mutual'),
    true
  ),
  'offered'::public.introduction_status,
  'one private acceptance does not reveal photos'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '53535353-5353-4535-8535-535353535352',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"53535353-5353-4535-8535-535353535352","session_id":"53535353-dddd-4ddd-8ddd-535353535352"}',
  true
);

select is(
  public.respond_to_introduction(
    (select id from m11_intro_ids where name = 'mutual'),
    true
  ),
  'mutually_accepted'::public.introduction_status,
  'the second acceptance enables the mutually accepted photo stage'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '53535353-5353-4535-8535-535353535351',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"53535353-5353-4535-8535-535353535351","session_id":"53535353-dddd-4ddd-8ddd-535353535351"}',
  true
);

select is(
  (
    select count(*)::integer
    from public.list_introduction_photo_refs(
      (select id from m11_intro_ids where name = 'mutual')
    )
  ),
  1,
  'only approved counterpart photos are listed after mutual acceptance'
);

select is(
  (
    select photo_id
    from public.list_introduction_photo_refs(
      (select id from m11_intro_ids where name = 'mutual')
    )
  ),
  (select id from m11_photo_ids where name = 'approved'),
  'the guarded list returns the approved opaque photo id'
);

select is(
  (
    select is_primary
    from public.list_introduction_photo_refs(
      (select id from m11_intro_ids where name = 'mutual')
    )
  ),
  true,
  'the approved primary portrait is identified without exposing its path'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '53535353-5353-4535-8535-535353535353',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"53535353-5353-4535-8535-535353535353","session_id":"53535353-dddd-4ddd-8ddd-535353535353"}',
  true
);

select throws_ok(
  $$select * from public.list_introduction_photo_refs(
    (select id from m11_intro_ids where name = 'mutual')
  )$$,
  'P0001',
  'introduction photos unavailable',
  'a non-participant cannot list another pair photo references'
);

reset role;
set local role service_role;

select is(
  public.resolve_introduction_photo_path_for_service(
    '53535353-5353-4535-8535-535353535351',
    (select id from m11_intro_ids where name = 'mutual'),
    (select id from m11_photo_ids where name = 'approved')
  ),
  '53535353-5353-4535-8535-535353535352/approved.jpg',
  'the trusted delivery path resolves only the authorized approved object'
);

select throws_ok(
  $$select public.resolve_introduction_photo_path_for_service(
    '53535353-5353-4535-8535-535353535351',
    (select id from m11_intro_ids where name = 'mutual'),
    (select id from m11_photo_ids where name = 'pending')
  )$$,
  'P0001',
  'introduction photo unavailable',
  'pending photos cannot be resolved by the delivery service'
);

update public.waitlist_preferences
set photo_privacy_preference = 'explicit_approval'
where application_id = '53535353-bbbb-4bbb-8bbb-535353535352';

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '53535353-5353-4535-8535-535353535351',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"53535353-5353-4535-8535-535353535351","session_id":"53535353-dddd-4ddd-8ddd-535353535351"}',
  true
);

select is(
  (
    select count(*)::integer
    from public.list_introduction_photo_refs(
      (select id from m11_intro_ids where name = 'mutual')
    )
  ),
  0,
  'explicit-approval preference stays closed until an approval workflow exists'
);

reset role;
set local role service_role;

select throws_ok(
  $$select public.resolve_introduction_photo_path_for_service(
    '53535353-5353-4535-8535-535353535351',
    (select id from m11_intro_ids where name = 'mutual'),
    (select id from m11_photo_ids where name = 'approved')
  )$$,
  'P0001',
  'introduction photo unavailable',
  'the delivery resolver also respects the current photo privacy preference'
);

reset role;
select * from finish();
rollback;
