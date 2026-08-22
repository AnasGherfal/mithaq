begin;
select plan(2);

select is(
  (
    select count(*)::bigint
    from public.waitlist_preferences
    where photo_privacy_preference::text in ('discovery_visible', 'blurred')
  ),
  0::bigint,
  'legacy photo privacy preferences are fully normalized'
);

select ok(
  not exists (
    select 1
    from public.waitlist_preferences
    where photo_privacy_preference is not null
      and photo_privacy_preference::text not in (
        'none',
        'after_mutual_interest',
        'explicit_approval',
        'after_family_involvement'
      )
  ),
  'saved photo privacy preferences use only the launch-facing canonical set'
);

select * from finish();
rollback;
