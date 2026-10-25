create or replace function public.get_admin_waitlist_analytics()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from private.moderation_staff s
    where s.user_id = v_user_id
      and s.active is true
      and s.role = 'admin'
  ) then
    raise exception 'admin access required';
  end if;

  select jsonb_build_object(
    'generated_at', clock_timestamp(),
    'summary', jsonb_build_object(
      'registered_accounts', (select count(*) from public.users),
      'applications', (select count(*) from public.waitlist_applications),
      'draft', (select count(*) from public.waitlist_applications where status = 'draft'),
      'submitted', (select count(*) from public.waitlist_applications where status in ('submitted', 'qualified', 'invited')),
      'submitted_last_7_days', (select count(*) from public.waitlist_applications where submitted_at >= now() - interval '7 days'),
      'active_referral_codes', (select count(*) from public.referral_codes where status = 'active' and (expires_at is null or expires_at > now())),
      'referral_submissions', (select count(*) from private.referral_events where event_type = 'submitted')
    ),
    'status_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('key', status::text, 'count', count_rows) order by status::text)
      from (
        select status, count(*)::bigint as count_rows
        from public.waitlist_applications
        group by status
      ) s
    ), '[]'::jsonb),
    'gender_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('key', gender::text, 'count', count_rows) order by gender::text)
      from (
        select gender, count(*)::bigint as count_rows
        from public.waitlist_applications
        where status in ('submitted', 'qualified', 'invited') and gender is not null
        group by gender
      ) g
    ), '[]'::jsonb),
    'residency_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('key', residency_type::text, 'count', count_rows) order by residency_type::text)
      from (
        select residency_type, count(*)::bigint as count_rows
        from public.waitlist_applications
        where status in ('submitted', 'qualified', 'invited') and residency_type is not null
        group by residency_type
      ) r
    ), '[]'::jsonb),
    'age_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('key', b.label, 'count', coalesce(x.count_rows, 0)) order by b.sort_order)
      from public.age_bands b
      left join (
        select age_band_id, count(*)::bigint as count_rows
        from public.waitlist_applications
        where status in ('submitted', 'qualified', 'invited') and age_band_id is not null
        group by age_band_id
      ) x on x.age_band_id = b.id
    ), '[]'::jsonb),
    'marriage_timeline_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('key', marriage_timeline::text, 'count', count_rows) order by marriage_timeline::text)
      from (
        select p.marriage_timeline, count(*)::bigint as count_rows
        from public.waitlist_preferences p
        join public.waitlist_applications a on a.id = p.application_id
        where a.status in ('submitted', 'qualified', 'invited') and p.marriage_timeline is not null
        group by p.marriage_timeline
      ) t
    ), '[]'::jsonb),
    'photo_privacy_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('key', photo_privacy_preference::text, 'count', count_rows) order by photo_privacy_preference::text)
      from (
        select p.photo_privacy_preference, count(*)::bigint as count_rows
        from public.waitlist_preferences p
        join public.waitlist_applications a on a.id = p.application_id
        where a.status in ('submitted', 'qualified', 'invited') and p.photo_privacy_preference is not null
        group by p.photo_privacy_preference
      ) pp
    ), '[]'::jsonb),
    'family_involvement_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('key', family_involvement_preference::text, 'count', count_rows) order by family_involvement_preference::text)
      from (
        select p.family_involvement_preference, count(*)::bigint as count_rows
        from public.waitlist_preferences p
        join public.waitlist_applications a on a.id = p.application_id
        where a.status in ('submitted', 'qualified', 'invited') and p.family_involvement_preference is not null
        group by p.family_involvement_preference
      ) f
    ), '[]'::jsonb),
    'identity_verification_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('key', willing_identity_verification::text, 'count', count_rows) order by willing_identity_verification::text)
      from (
        select p.willing_identity_verification, count(*)::bigint as count_rows
        from public.waitlist_preferences p
        join public.waitlist_applications a on a.id = p.application_id
        where a.status in ('submitted', 'qualified', 'invited') and p.willing_identity_verification is not null
        group by p.willing_identity_verification
      ) i
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_admin_waitlist_analytics() from public;
revoke execute on function public.get_admin_waitlist_analytics() from anon;
grant execute on function public.get_admin_waitlist_analytics() to authenticated;
