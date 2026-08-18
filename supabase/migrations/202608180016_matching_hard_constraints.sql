create or replace function private.member_accepts_partner(
  p_member_id uuid,
  p_partner_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.waitlist_applications member_app
    join public.waitlist_preferences member_pref
      on member_pref.application_id = member_app.id
    join public.waitlist_applications partner_app
      on partner_app.user_id = p_partner_id
    join public.age_bands partner_age
      on partner_age.id = partner_app.age_band_id
    where member_app.user_id = p_member_id
      and member_app.gender is not null
      and partner_app.gender is not null
      and member_app.gender <> partner_app.gender
      and (
        (partner_app.residency_type = 'libya'::public.residency_type and coalesce(member_pref.open_to_libya, false))
        or
        (partner_app.residency_type = 'diaspora'::public.residency_type and coalesce(member_pref.open_to_diaspora, false))
      )
      and (
        member_pref.preferred_partner_age_min is null
        or coalesce(partner_age.max_age, 120) >= member_pref.preferred_partner_age_min
      )
      and (
        member_pref.preferred_partner_age_max is null
        or partner_age.min_age <= member_pref.preferred_partner_age_max
      )
      and (
        not exists (
          select 1
          from public.waitlist_accepted_marital_statuses accepted
          where accepted.application_id = member_app.id
        )
        or exists (
          select 1
          from public.waitlist_accepted_marital_statuses accepted
          where accepted.application_id = member_app.id
            and accepted.marital_status = partner_app.marital_status
        )
      )
      and (
        partner_app.has_children is not true
        or member_pref.accepts_partner_with_children in (
          'yes'::public.tristate_preference,
          'depends'::public.tristate_preference
        )
        or member_pref.accepts_partner_with_children is null
      )
      and (
        not exists (
          select 1
          from public.waitlist_preferred_countries preferred_country
          where preferred_country.application_id = member_app.id
        )
        or exists (
          select 1
          from public.waitlist_preferred_countries preferred_country
          where preferred_country.application_id = member_app.id
            and preferred_country.country_code = partner_app.current_country_code
        )
      )
  );
$$;

create or replace function private.members_match_hard_constraints(
  p_user_a_id uuid,
  p_user_b_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select
    p_user_a_id is not null
    and p_user_b_id is not null
    and p_user_a_id <> p_user_b_id
    and private.member_can_participate(p_user_a_id)
    and private.member_can_participate(p_user_b_id)
    and not private.members_are_blocked(p_user_a_id, p_user_b_id)
    and private.member_accepts_partner(p_user_a_id, p_user_b_id)
    and private.member_accepts_partner(p_user_b_id, p_user_a_id);
$$;

create or replace function public.get_hard_match_candidates(
  p_user_id uuid,
  p_limit integer default 20
)
returns table (
  candidate_user_id uuid,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_user_id is null then
    raise exception 'member required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'candidate limit must be between 1 and 100';
  end if;

  if not private.member_can_participate(p_user_id) then
    raise exception 'member not eligible for matching';
  end if;

  return query
  select
    candidate.id,
    candidate_app.submitted_at
  from public.users candidate
  join public.waitlist_applications candidate_app
    on candidate_app.user_id = candidate.id
  where candidate.id <> p_user_id
    and private.members_match_hard_constraints(p_user_id, candidate.id)
    and not exists (
      select 1
      from private.controlled_introductions i
      where i.pair_key = case
        when p_user_id::text < candidate.id::text
          then p_user_id::text || ':' || candidate.id::text
        else candidate.id::text || ':' || p_user_id::text
      end
        and i.status in ('offered', 'mutually_accepted')
    )
  order by candidate_app.submitted_at asc nulls last, candidate.id
  limit p_limit;
end;
$$;

create or replace function public.create_controlled_introduction(
  p_user_a_id uuid,
  p_user_b_id uuid,
  p_expires_at timestamptz default null,
  p_actor_reference text default 'matching-engine'
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_id uuid;
  v_expires_at timestamptz := coalesce(p_expires_at, clock_timestamp() + interval '7 days');
  v_actor_reference text := nullif(btrim(p_actor_reference), '');
begin
  if p_user_a_id is null or p_user_b_id is null or p_user_a_id = p_user_b_id then
    raise exception 'invalid introduction pair';
  end if;

  if v_actor_reference is null or char_length(v_actor_reference) > 120 then
    raise exception 'invalid introduction actor';
  end if;

  if v_expires_at <= clock_timestamp() then
    raise exception 'invalid introduction expiry';
  end if;

  if not private.member_can_participate(p_user_a_id)
     or not private.member_can_participate(p_user_b_id) then
    raise exception 'member not eligible for introduction';
  end if;

  if private.members_are_blocked(p_user_a_id, p_user_b_id) then
    raise exception 'introduction pair blocked';
  end if;

  if not private.members_match_hard_constraints(p_user_a_id, p_user_b_id) then
    raise exception 'introduction pair does not meet hard constraints';
  end if;

  if exists (
    select 1
    from private.controlled_introductions i
    where i.pair_key = case
      when p_user_a_id::text < p_user_b_id::text
        then p_user_a_id::text || ':' || p_user_b_id::text
      else p_user_b_id::text || ':' || p_user_a_id::text
    end
      and i.status in ('offered', 'mutually_accepted')
  ) then
    raise exception 'active introduction already exists';
  end if;

  insert into private.controlled_introductions (
    user_a_id,
    user_b_id,
    expires_at,
    created_by
  ) values (
    p_user_a_id,
    p_user_b_id,
    v_expires_at,
    v_actor_reference
  )
  returning id into v_id;

  insert into private.controlled_introduction_events (
    introduction_id,
    event_type,
    actor_reference
  ) values (
    v_id,
    'created',
    v_actor_reference
  );

  return v_id;
end;
$$;

revoke all on function private.member_accepts_partner(uuid, uuid) from public, anon, authenticated;
grant execute on function private.member_accepts_partner(uuid, uuid) to service_role;

revoke all on function private.members_match_hard_constraints(uuid, uuid) from public, anon, authenticated;
grant execute on function private.members_match_hard_constraints(uuid, uuid) to service_role;

revoke all on function public.get_hard_match_candidates(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_hard_match_candidates(uuid, integer) to service_role;
