-- RLS policies decide which rows an authenticated user may access.
-- These grants expose only the table operations required by Stage A user flows.

revoke all on public.age_bands from anon, authenticated;
revoke all on public.users from anon, authenticated;
revoke all on public.waitlist_applications from anon, authenticated;
revoke all on public.waitlist_preferences from anon, authenticated;
revoke all on public.waitlist_accepted_marital_statuses from anon, authenticated;
revoke all on public.waitlist_preferred_countries from anon, authenticated;
revoke all on public.waitlist_consents from anon, authenticated;
revoke all on public.referral_codes from anon, authenticated;
revoke all on public.deletion_requests from anon, authenticated;

grant select on public.age_bands to authenticated;

grant select, update on public.users to authenticated;

grant select, insert, update on public.waitlist_applications to authenticated;
grant select, insert, update on public.waitlist_preferences to authenticated;

grant select, insert, delete on public.waitlist_accepted_marital_statuses to authenticated;
grant select, insert, delete on public.waitlist_preferred_countries to authenticated;

grant select, insert on public.waitlist_consents to authenticated;
grant select on public.referral_codes to authenticated;
grant select, insert on public.deletion_requests to authenticated;

-- Operational/private tables remain inaccessible to browser roles.
revoke all on all tables in schema private from anon, authenticated;
