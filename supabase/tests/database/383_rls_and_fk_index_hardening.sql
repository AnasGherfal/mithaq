begin;
select plan(14);

select ok(
  position('( SELECT auth.uid()' in pg_get_expr(pol.polqual, pol.polrelid)) > 0,
  'users read policy caches auth.uid() per statement'
)
from pg_policy pol
where pol.polrelid = 'public.users'::regclass
  and pol.polname = 'users read own row';

select ok(
  position('( SELECT auth.uid()' in pg_get_expr(pol.polqual, pol.polrelid)) > 0,
  'member profile read policy caches auth.uid() per statement'
)
from pg_policy pol
where pol.polrelid = 'public.member_profiles'::regclass
  and pol.polname = 'member profiles read own';

select ok(
  position('( SELECT auth.uid()' in pg_get_expr(pol.polqual, pol.polrelid)) > 0,
  'safety report read policy caches auth.uid() per statement'
)
from pg_policy pol
where pol.polrelid = 'public.safety_reports'::regclass
  and pol.polname = 'members read own safety reports';

select ok(to_regclass('private.controlled_introduction_events_actor_idx') is not null,
  'introduction event actor foreign key has a covering index');
select ok(to_regclass('private.conversation_events_actor_idx') is not null,
  'conversation event actor foreign key has a covering index');
select ok(to_regclass('private.conversation_messages_sender_idx') is not null,
  'conversation message sender foreign key has a covering index');
select ok(to_regclass('private.member_notifications_introduction_idx') is not null,
  'notification introduction foreign key has a covering index');
select ok(to_regclass('private.member_notifications_message_idx') is not null,
  'notification message foreign key has a covering index');
select ok(to_regclass('private.member_photo_cleanup_jobs_user_idx') is not null,
  'photo cleanup user foreign key has a covering index');
select ok(to_regclass('private.phone_verifications_user_idx') is not null,
  'phone verification user foreign key has a covering index');
select ok(to_regclass('private.referral_events_referred_user_idx') is not null,
  'referral event referred-user foreign key has a covering index');
select ok(to_regclass('public.waitlist_consents_supersedes_idx') is not null,
  'consent supersedes foreign key has a covering index');
select ok(to_regclass('public.waitlist_consents_user_idx') is not null,
  'consent user foreign key has a covering index');

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ~ 'auth\\.uid\\(\\)'
        or coalesce(with_check, '') ~ 'auth\\.uid\\(\\)'
      )
      and coalesce(qual, '') !~ '\\( SELECT auth\\.uid\\(\\)'
      and coalesce(with_check, '') !~ '\\( SELECT auth\\.uid\\(\\)'
  ),
  0,
  'public RLS policies no longer re-evaluate auth.uid() per row'
);

select * from finish();
rollback;
