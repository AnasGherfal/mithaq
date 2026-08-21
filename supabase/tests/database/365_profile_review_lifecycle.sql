begin;
select plan(5);

select is(
  has_function_privilege('authenticated', 'private.sync_member_profile_review_after_save()', 'EXECUTE'),
  false,
  'members cannot invoke the profile-review lifecycle trigger function directly'
);

insert into auth.users (
  id, instance_id, aud, role, created_at, updated_at
) values (
  '75757575-7575-4757-8757-757575757575',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  now(),
  now()
) on conflict (id) do nothing;

insert into public.users (id)
values ('75757575-7575-4757-8757-757575757575')
on conflict (id) do nothing;

insert into public.member_profiles (
  user_id,
  display_name,
  about_me,
  profile_completed_at
) values (
  '75757575-7575-4757-8757-757575757575',
  'QA Member',
  'A complete profile used to verify the private review lifecycle behavior.',
  clock_timestamp()
);

select is(
  (select state::text from public.member_profile_reviews where user_id = '75757575-7575-4757-8757-757575757575'),
  'pending',
  'a completed profile automatically enters pending review'
);

update public.member_profile_reviews
set state = 'approved'::public.member_profile_review_state,
    updated_at = clock_timestamp()
where user_id = '75757575-7575-4757-8757-757575757575';

update public.member_profiles
set about_me = 'An updated complete profile that must return to review before discovery.',
    updated_at = clock_timestamp()
where user_id = '75757575-7575-4757-8757-757575757575';

select is(
  (select state::text from public.member_profile_reviews where user_id = '75757575-7575-4757-8757-757575757575'),
  'pending',
  'editing approved profile content returns the profile to pending review'
);

select is(
  (
    select note_code
    from private.member_profile_review_events
    where user_id = '75757575-7575-4757-8757-757575757575'
    order by recorded_at desc, id desc
    limit 1
  ),
  'profile_updated',
  'profile review reset is audit recorded'
);

select is(
  (
    select actor_reference
    from private.member_profile_review_events
    where user_id = '75757575-7575-4757-8757-757575757575'
    order by recorded_at desc, id desc
    limit 1
  ),
  'member-profile-save',
  'profile review audit identifies the member profile save flow'
);

select * from finish();
rollback;
