create or replace function private.member_meets_launch_identity_trust(
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private, auth
as $$
  select
    exists (
      select 1
      from auth.users au
      where au.id = p_user_id
        and au.phone_confirmed_at is not null
    )
    and exists (
      select 1
      from public.waitlist_consents c
      where c.user_id = p_user_id
        and c.consent_type = 'age_18_plus'
        and c.event_type = 'granted'
        and not exists (
          select 1
          from public.waitlist_consents newer
          where newer.user_id = c.user_id
            and newer.consent_type = c.consent_type
            and newer.recorded_at > c.recorded_at
        )
    );
$$;

revoke all on function private.member_meets_launch_identity_trust(uuid)
  from public, anon, authenticated;
grant execute on function private.member_meets_launch_identity_trust(uuid)
  to service_role;
