-- Release hardening: keep auth.uid() stable per statement in RLS and cover
-- launch-relevant foreign keys used by moderation, retention, and relationship cleanup.

-- Own-row policies: wrap auth.uid() in a scalar subquery so Postgres can
-- evaluate it once per statement instead of once per row.

drop policy if exists "users read own row" on public.users;
create policy "users read own row"
on public.users
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists "users update own row" on public.users;
create policy "users update own row"
on public.users
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "applications read own" on public.waitlist_applications;
create policy "applications read own"
on public.waitlist_applications
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "applications insert own active" on public.waitlist_applications;
create policy "applications insert own active"
on public.waitlist_applications
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.account_status = 'active'::public.account_status
  )
);

drop policy if exists "applications update own active" on public.waitlist_applications;
create policy "applications update own active"
on public.waitlist_applications
for update
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.account_status = 'active'::public.account_status
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.account_status = 'active'::public.account_status
  )
);

drop policy if exists "consents read own" on public.waitlist_consents;
create policy "consents read own"
on public.waitlist_consents
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "consents insert own" on public.waitlist_consents;
create policy "consents insert own"
on public.waitlist_consents
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "preferences read own" on public.waitlist_preferences;
create policy "preferences read own"
on public.waitlist_preferences
for select
to authenticated
using (
  exists (
    select 1
    from public.waitlist_applications a
    where a.id = waitlist_preferences.application_id
      and a.user_id = (select auth.uid())
  )
);

drop policy if exists "preferences insert own active" on public.waitlist_preferences;
create policy "preferences insert own active"
on public.waitlist_preferences
for insert
to authenticated
with check (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = waitlist_preferences.application_id
      and a.user_id = (select auth.uid())
      and u.account_status = 'active'::public.account_status
  )
);

drop policy if exists "preferences update own active" on public.waitlist_preferences;
create policy "preferences update own active"
on public.waitlist_preferences
for update
to authenticated
using (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = waitlist_preferences.application_id
      and a.user_id = (select auth.uid())
      and u.account_status = 'active'::public.account_status
  )
)
with check (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = waitlist_preferences.application_id
      and a.user_id = (select auth.uid())
      and u.account_status = 'active'::public.account_status
  )
);

drop policy if exists "accepted statuses read own" on public.waitlist_accepted_marital_statuses;
create policy "accepted statuses read own"
on public.waitlist_accepted_marital_statuses
for select
to authenticated
using (
  exists (
    select 1
    from public.waitlist_applications a
    where a.id = waitlist_accepted_marital_statuses.application_id
      and a.user_id = (select auth.uid())
  )
);

drop policy if exists "accepted statuses insert own active" on public.waitlist_accepted_marital_statuses;
create policy "accepted statuses insert own active"
on public.waitlist_accepted_marital_statuses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = waitlist_accepted_marital_statuses.application_id
      and a.user_id = (select auth.uid())
      and u.account_status = 'active'::public.account_status
  )
);

drop policy if exists "accepted statuses delete own active" on public.waitlist_accepted_marital_statuses;
create policy "accepted statuses delete own active"
on public.waitlist_accepted_marital_statuses
for delete
to authenticated
using (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = waitlist_accepted_marital_statuses.application_id
      and a.user_id = (select auth.uid())
      and u.account_status = 'active'::public.account_status
  )
);

drop policy if exists "preferred countries read own" on public.waitlist_preferred_countries;
create policy "preferred countries read own"
on public.waitlist_preferred_countries
for select
to authenticated
using (
  exists (
    select 1
    from public.waitlist_applications a
    where a.id = waitlist_preferred_countries.application_id
      and a.user_id = (select auth.uid())
  )
);

drop policy if exists "preferred countries insert own active" on public.waitlist_preferred_countries;
create policy "preferred countries insert own active"
on public.waitlist_preferred_countries
for insert
to authenticated
with check (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = waitlist_preferred_countries.application_id
      and a.user_id = (select auth.uid())
      and u.account_status = 'active'::public.account_status
  )
);

drop policy if exists "preferred countries delete own active" on public.waitlist_preferred_countries;
create policy "preferred countries delete own active"
on public.waitlist_preferred_countries
for delete
to authenticated
using (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = waitlist_preferred_countries.application_id
      and a.user_id = (select auth.uid())
      and u.account_status = 'active'::public.account_status
  )
);

drop policy if exists "members read own safety reports" on public.safety_reports;
create policy "members read own safety reports"
on public.safety_reports
for select
to authenticated
using (reporter_user_id = (select auth.uid()));

drop policy if exists "members read own safety state" on public.member_safety_states;
create policy "members read own safety state"
on public.member_safety_states
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "members read own profile review state" on public.member_profile_reviews;
create policy "members read own profile review state"
on public.member_profile_reviews
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "member photos read own" on public.member_profile_photos;
create policy "member photos read own"
on public.member_profile_photos
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "member profiles read own" on public.member_profiles;
create policy "member profiles read own"
on public.member_profiles
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "members read own blocks" on public.member_blocks;
create policy "members read own blocks"
on public.member_blocks
for select
to authenticated
using (blocker_user_id = (select auth.uid()));

drop policy if exists "referral code read own" on public.referral_codes;
create policy "referral code read own"
on public.referral_codes
for select
to authenticated
using (owner_user_id = (select auth.uid()));

drop policy if exists "deletion requests read own" on public.deletion_requests;
create policy "deletion requests read own"
on public.deletion_requests
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "deletion requests insert own" on public.deletion_requests;
create policy "deletion requests insert own"
on public.deletion_requests
for insert
to authenticated
with check (user_id = (select auth.uid()));

-- Launch-relevant covering indexes for foreign keys. These improve delete,
-- retention, moderation, and relationship cleanup paths without exposing data.
create index if not exists controlled_introduction_events_actor_idx
  on private.controlled_introduction_events (actor_user_id);

create index if not exists conversation_events_actor_idx
  on private.conversation_events (actor_user_id);

create index if not exists conversation_messages_sender_idx
  on private.conversation_messages (sender_user_id);

create index if not exists member_notifications_introduction_idx
  on private.member_notifications (introduction_id);

create index if not exists member_notifications_message_idx
  on private.member_notifications (message_id)
  where message_id is not null;

create index if not exists member_photo_cleanup_jobs_user_idx
  on private.member_photo_cleanup_jobs (user_id);

create index if not exists phone_verifications_user_idx
  on private.phone_verifications (user_id);

create index if not exists referral_events_referred_user_idx
  on private.referral_events (referred_user_id)
  where referred_user_id is not null;

create index if not exists waitlist_consents_supersedes_idx
  on public.waitlist_consents (supersedes_id)
  where supersedes_id is not null;

create index if not exists waitlist_consents_user_idx
  on public.waitlist_consents (user_id);
