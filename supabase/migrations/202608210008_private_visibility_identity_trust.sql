create type public.marriage_visibility_mode as enum (
  'standard',
  'private'
);

create table public.marriage_visibility_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  visibility_mode public.marriage_visibility_mode not null default 'private',
  updated_at timestamptz not null default clock_timestamp()
);

alter table public.marriage_visibility_settings enable row level security;

create policy "marriage visibility read own"
on public.marriage_visibility_settings
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.marriage_visibility_settings from public, anon;
revoke insert, update, delete on table public.marriage_visibility_settings from authenticated;
grant select on table public.marriage_visibility_settings to authenticated;
grant select, insert, update, delete on table public.marriage_visibility_settings to service_role;

-- Preserve existing members' current behavior. New Marriage members default to
-- private unless they explicitly choose standard visibility.
insert into public.marriage_visibility_settings (user_id, visibility_mode)
select s.user_id, 'standard'::public.marriage_visibility_mode
from public.member_connection_spaces s
where s.space = 'marriage'::public.connection_space
on conflict (user_id) do nothing;

create or replace function private.ensure_marriage_visibility_setting()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.space = 'marriage'::public.connection_space then
    insert into public.marriage_visibility_settings (user_id, visibility_mode)
    values (new.user_id, 'private'::public.marriage_visibility_mode)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists marriage_space_ensures_visibility_setting on public.member_connection_spaces;
create trigger marriage_space_ensures_visibility_setting
after insert or update of membership_state on public.member_connection_spaces
for each row execute function private.ensure_marriage_visibility_setting();

revoke all on function private.ensure_marriage_visibility_setting()
  from public, anon, authenticated;
grant execute on function private.ensure_marriage_visibility_setting()
  to service_role;

create or replace function public.get_my_marriage_visibility()
returns public.marriage_visibility_mode
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_mode public.marriage_visibility_mode;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.member_connection_spaces s
    where s.user_id = v_user_id
      and s.space = 'marriage'::public.connection_space
      and s.membership_state = 'active'::public.connection_space_membership_state
  ) then
    raise exception 'marriage space required';
  end if;

  select s.visibility_mode
  into v_mode
  from public.marriage_visibility_settings s
  where s.user_id = v_user_id;

  return coalesce(v_mode, 'private'::public.marriage_visibility_mode);
end;
$$;

create or replace function public.set_my_marriage_visibility(
  p_visibility_mode public.marriage_visibility_mode
)
returns public.marriage_visibility_mode
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_visibility_mode is null then
    raise exception 'visibility choice required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) or not exists (
    select 1
    from public.member_connection_spaces s
    where s.user_id = v_user_id
      and s.space = 'marriage'::public.connection_space
      and s.membership_state = 'active'::public.connection_space_membership_state
  ) then
    raise exception 'marriage space unavailable';
  end if;

  insert into public.marriage_visibility_settings (
    user_id,
    visibility_mode,
    updated_at
  ) values (
    v_user_id,
    p_visibility_mode,
    clock_timestamp()
  )
  on conflict (user_id) do update
  set visibility_mode = excluded.visibility_mode,
      updated_at = excluded.updated_at;

  return p_visibility_mode;
end;
$$;

revoke all on function public.get_my_marriage_visibility() from public, anon;
revoke all on function public.set_my_marriage_visibility(public.marriage_visibility_mode) from public, anon;
grant execute on function public.get_my_marriage_visibility() to authenticated, service_role;
grant execute on function public.set_my_marriage_visibility(public.marriage_visibility_mode) to authenticated, service_role;

create table private.marriage_discovery_hides (
  actor_user_id uuid not null references public.users(id) on delete cascade,
  hidden_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  primary key (actor_user_id, hidden_user_id),
  check (actor_user_id <> hidden_user_id)
);

create index marriage_discovery_hides_hidden_idx
  on private.marriage_discovery_hides (hidden_user_id, actor_user_id);

revoke all on table private.marriage_discovery_hides from public, anon, authenticated;
grant select, insert, update, delete on table private.marriage_discovery_hides to service_role;

create or replace function private.marriage_pair_is_hidden(
  p_user_a_id uuid,
  p_user_b_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = private
as $$
  select exists (
    select 1
    from private.marriage_discovery_hides h
    where (h.actor_user_id = p_user_a_id and h.hidden_user_id = p_user_b_id)
       or (h.actor_user_id = p_user_b_id and h.hidden_user_id = p_user_a_id)
  );
$$;

create or replace function private.marriage_discovery_candidate_visible(
  p_viewer_user_id uuid,
  p_candidate_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select
    p_viewer_user_id is not null
    and p_candidate_user_id is not null
    and p_viewer_user_id <> p_candidate_user_id
    and not private.marriage_pair_is_hidden(p_viewer_user_id, p_candidate_user_id)
    and (
      coalesce(
        (
          select s.visibility_mode
          from public.marriage_visibility_settings s
          where s.user_id = p_candidate_user_id
        ),
        'private'::public.marriage_visibility_mode
      ) = 'standard'::public.marriage_visibility_mode
      or exists (
        select 1
        from private.marriage_discovery_actions d
        where d.actor_user_id = p_candidate_user_id
          and d.candidate_user_id = p_viewer_user_id
          and d.action = 'noticed'::public.marriage_discovery_action
      )
    );
$$;

revoke all on function private.marriage_pair_is_hidden(uuid, uuid)
  from public, anon, authenticated;
revoke all on function private.marriage_discovery_candidate_visible(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.marriage_pair_is_hidden(uuid, uuid) to service_role;
grant execute on function private.marriage_discovery_candidate_visible(uuid, uuid) to service_role;

create or replace function public.hide_marriage_discovery_member(
  p_target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_target_user_id is null or p_target_user_id = v_user_id then
    raise exception 'member unavailable';
  end if;

  if not private.marriage_member_is_discoverable(v_user_id)
     or not private.marriage_member_is_discoverable(p_target_user_id) then
    raise exception 'member unavailable';
  end if;

  insert into private.marriage_discovery_hides (actor_user_id, hidden_user_id)
  values (v_user_id, p_target_user_id)
  on conflict (actor_user_id, hidden_user_id) do nothing;

  -- If the member had previously expressed interest, hiding overrides that
  -- signal so the target cannot become eligible to see them through it.
  delete from private.marriage_discovery_actions d
  where d.actor_user_id = v_user_id
    and d.candidate_user_id = p_target_user_id;

  return true;
end;
$$;

revoke all on function public.hide_marriage_discovery_member(uuid) from public, anon;
grant execute on function public.hide_marriage_discovery_member(uuid) to authenticated, service_role;

create type private.identity_verification_level as enum (
  'unverified',
  'selfie_verified',
  'id_verified'
);

create table private.member_identity_trust (
  user_id uuid primary key references public.users(id) on delete cascade,
  verification_level private.identity_verification_level not null default 'unverified',
  age_18_plus_verified boolean not null default false,
  provider_reference text check (provider_reference is null or char_length(provider_reference) <= 160),
  verified_at timestamptz,
  updated_at timestamptz not null default clock_timestamp()
);

revoke all on table private.member_identity_trust from public, anon, authenticated;
grant select, insert, update, delete on table private.member_identity_trust to service_role;

create or replace function public.get_my_identity_trust_summary()
returns table (
  phone_verified boolean,
  approved_photo boolean,
  real_person_verified boolean,
  age_18_plus_verified boolean,
  identity_verified boolean
)
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_level private.identity_verification_level := 'unverified';
  v_age_verified boolean := false;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select t.verification_level, t.age_18_plus_verified
  into v_level, v_age_verified
  from private.member_identity_trust t
  where t.user_id = v_user_id;

  v_level := coalesce(v_level, 'unverified'::private.identity_verification_level);
  v_age_verified := coalesce(v_age_verified, false);

  return query
  select
    exists (
      select 1
      from auth.users au
      where au.id = v_user_id
        and au.phone_confirmed_at is not null
    ),
    exists (
      select 1
      from public.member_profile_photos p
      where p.user_id = v_user_id
        and p.review_state = 'approved'::public.member_photo_review_state
    ),
    v_level in (
      'selfie_verified'::private.identity_verification_level,
      'id_verified'::private.identity_verification_level
    ),
    v_age_verified,
    v_level = 'id_verified'::private.identity_verification_level;
end;
$$;

create or replace function public.set_member_identity_trust_for_service(
  p_user_id uuid,
  p_verification_level text,
  p_age_18_plus_verified boolean,
  p_provider_reference text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_level private.identity_verification_level;
  v_provider_reference text := nullif(btrim(p_provider_reference), '');
begin
  if p_user_id is null then
    raise exception 'member required';
  end if;

  if p_verification_level not in ('unverified', 'selfie_verified', 'id_verified') then
    raise exception 'invalid verification level';
  end if;

  if v_provider_reference is not null and char_length(v_provider_reference) > 160 then
    raise exception 'invalid verification reference';
  end if;

  v_level := p_verification_level::private.identity_verification_level;

  if v_level = 'unverified'::private.identity_verification_level
     and coalesce(p_age_18_plus_verified, false) then
    raise exception 'age verification requires verified identity evidence';
  end if;

  insert into private.member_identity_trust (
    user_id,
    verification_level,
    age_18_plus_verified,
    provider_reference,
    verified_at,
    updated_at
  ) values (
    p_user_id,
    v_level,
    coalesce(p_age_18_plus_verified, false),
    v_provider_reference,
    case when v_level = 'unverified'::private.identity_verification_level then null else clock_timestamp() end,
    clock_timestamp()
  )
  on conflict (user_id) do update
  set verification_level = excluded.verification_level,
      age_18_plus_verified = excluded.age_18_plus_verified,
      provider_reference = excluded.provider_reference,
      verified_at = excluded.verified_at,
      updated_at = excluded.updated_at;

  return true;
end;
$$;

revoke all on function public.get_my_identity_trust_summary() from public, anon;
grant execute on function public.get_my_identity_trust_summary() to authenticated, service_role;

revoke all on function public.set_member_identity_trust_for_service(uuid, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.set_member_identity_trust_for_service(uuid, text, boolean, text)
  to service_role;

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
      from public.member_profile_photos p
      where p.user_id = p_user_id
        and p.review_state = 'approved'::public.member_photo_review_state
    )
    and exists (
      select 1
      from private.member_identity_trust t
      where t.user_id = p_user_id
        and t.verification_level in (
          'selfie_verified'::private.identity_verification_level,
          'id_verified'::private.identity_verification_level
        )
        and t.age_18_plus_verified
    );
$$;

revoke all on function private.member_meets_launch_identity_trust(uuid)
  from public, anon, authenticated;
grant execute on function private.member_meets_launch_identity_trust(uuid)
  to service_role;

create or replace function public.list_marriage_discovery(p_limit integer default 6)
returns table (
  user_id uuid,
  display_name text,
  about_me text,
  occupation text,
  education text,
  city text,
  origin_region text,
  age_band_id smallint,
  age_band_label text,
  marital_status public.marital_status,
  has_children boolean,
  photo_id uuid,
  photo_display_mode text,
  alignment_reasons text[],
  alignment_count integer
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_my_city text;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 12 then raise exception 'invalid marriage discovery limit'; end if;
  if not private.marriage_member_is_discoverable(v_user_id) then raise exception 'marriage profile required'; end if;

  select a.current_city into v_my_city
  from public.waitlist_applications a
  where a.user_id = v_user_id;

  return query
  with candidate_rows as (
    select
      p.user_id,
      p.display_name,
      p.about_me,
      case when p.share_occupation then p.occupation else null end as occupation,
      case when p.share_education then p.education else null end as education,
      a.current_city as city,
      case when p.share_origin_region then a.libyan_origin_region else null end as origin_region,
      a.age_band_id,
      age.label as age_band_label,
      a.marital_status,
      a.has_children,
      case
        when photo.id is not null
         and pref.photo_privacy_preference in (
           'discovery_visible'::public.photo_privacy_preference,
           'blurred'::public.photo_privacy_preference
         ) then photo.id
        else null
      end as photo_id,
      case
        when photo.id is null then 'hidden'
        when pref.photo_privacy_preference = 'discovery_visible'::public.photo_privacy_preference then 'full'
        when pref.photo_privacy_preference = 'blurred'::public.photo_privacy_preference then 'blurred'
        else 'hidden'
      end as photo_display_mode,
      private.marriage_practical_alignment_reasons(v_user_id, p.user_id) as practical_reasons,
      case
        when v_my_city is not null
         and a.current_city is not null
         and lower(v_my_city) = lower(a.current_city) then true
        else false
      end as same_city,
      exists (
        select 1
        from private.marriage_discovery_actions incoming
        where incoming.actor_user_id = p.user_id
          and incoming.candidate_user_id = v_user_id
          and incoming.action = 'noticed'::public.marriage_discovery_action
      ) as incoming_noticed
    from public.member_profiles p
    join public.waitlist_applications a on a.user_id = p.user_id
    join public.age_bands age on age.id = a.age_band_id
    join public.waitlist_preferences pref on pref.application_id = a.id
    left join lateral (
      select pp.id
      from public.member_profile_photos pp
      where pp.user_id = p.user_id
        and pp.review_state = 'approved'::public.member_photo_review_state
      order by pp.is_primary desc, pp.position, pp.created_at, pp.id
      limit 1
    ) photo on true
    where p.user_id <> v_user_id
      and private.marriage_member_is_discoverable(p.user_id)
      and private.members_match_hard_constraints(v_user_id, p.user_id)
      and private.marriage_discovery_candidate_visible(v_user_id, p.user_id)
      and not exists (
        select 1
        from private.controlled_introductions i
        where i.pair_key = case
          when v_user_id::text < p.user_id::text then v_user_id::text || ':' || p.user_id::text
          else p.user_id::text || ':' || v_user_id::text
        end
        and i.status in ('offered', 'mutually_accepted')
      )
      and not exists (
        select 1
        from private.marriage_discovery_actions d
        where d.actor_user_id = v_user_id
          and d.candidate_user_id = p.user_id
          and (
            d.action = 'noticed'::public.marriage_discovery_action
            or d.created_at >= clock_timestamp() - interval '14 days'
          )
      )
  ), scored as (
    select
      c.*,
      case when c.same_city then array_prepend('same_city', c.practical_reasons) else c.practical_reasons end as reasons
    from candidate_rows c
  )
  select
    s.user_id,
    s.display_name,
    s.about_me,
    s.occupation,
    s.education,
    s.city,
    s.origin_region,
    s.age_band_id,
    s.age_band_label,
    s.marital_status,
    s.has_children,
    s.photo_id,
    s.photo_display_mode,
    s.reasons,
    cardinality(s.reasons)::integer
  from scored s
  order by
    s.incoming_noticed desc,
    cardinality(s.reasons) desc,
    s.same_city desc,
    md5(s.user_id::text || current_date::text || v_user_id::text)
  limit p_limit;
end;
$$;

revoke all on function public.list_marriage_discovery(integer) from public, anon;
grant execute on function public.list_marriage_discovery(integer) to authenticated, service_role;

create or replace function public.record_marriage_discovery_action(
  p_candidate_user_id uuid,
  p_action public.marriage_discovery_action
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_candidate_user_id is null or p_candidate_user_id = v_user_id or p_action is null then
    raise exception 'marriage discovery action unavailable';
  end if;
  if not private.marriage_member_is_discoverable(v_user_id)
     or not private.marriage_member_is_discoverable(p_candidate_user_id)
     or not private.members_match_hard_constraints(v_user_id, p_candidate_user_id)
     or not private.marriage_discovery_candidate_visible(v_user_id, p_candidate_user_id)
     or private.members_are_blocked(v_user_id, p_candidate_user_id)
     or private.marriage_pair_is_hidden(v_user_id, p_candidate_user_id) then
    raise exception 'marriage discovery action unavailable';
  end if;
  if exists (
    select 1 from private.controlled_introductions i
    where i.pair_key = case
      when v_user_id::text < p_candidate_user_id::text then v_user_id::text || ':' || p_candidate_user_id::text
      else p_candidate_user_id::text || ':' || v_user_id::text
    end
    and i.status in ('offered', 'mutually_accepted')
  ) then raise exception 'marriage discovery action unavailable'; end if;

  insert into private.marriage_discovery_actions (actor_user_id, candidate_user_id, action)
  values (v_user_id, p_candidate_user_id, p_action)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.record_marriage_discovery_action(uuid, public.marriage_discovery_action) from public, anon;
grant execute on function public.record_marriage_discovery_action(uuid, public.marriage_discovery_action)
  to authenticated, service_role;

create or replace function public.resolve_marriage_discovery_photo_path_for_service(
  p_viewer_user_id uuid,
  p_candidate_user_id uuid,
  p_photo_id uuid
)
returns table (
  storage_path text,
  display_mode text
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_viewer_user_id is null
     or p_candidate_user_id is null
     or p_photo_id is null
     or p_viewer_user_id = p_candidate_user_id then
    raise exception 'marriage discovery photo unavailable';
  end if;

  if not private.marriage_member_is_discoverable(p_viewer_user_id)
     or not private.marriage_member_is_discoverable(p_candidate_user_id)
     or not private.members_match_hard_constraints(p_viewer_user_id, p_candidate_user_id)
     or not private.marriage_discovery_candidate_visible(p_viewer_user_id, p_candidate_user_id)
     or private.members_are_blocked(p_viewer_user_id, p_candidate_user_id) then
    raise exception 'marriage discovery photo unavailable';
  end if;

  if exists (
    select 1
    from private.controlled_introductions i
    where i.pair_key = case
      when p_viewer_user_id::text < p_candidate_user_id::text
        then p_viewer_user_id::text || ':' || p_candidate_user_id::text
      else p_candidate_user_id::text || ':' || p_viewer_user_id::text
    end
      and i.status in ('offered', 'mutually_accepted')
  ) then
    raise exception 'marriage discovery photo unavailable';
  end if;

  if exists (
    select 1
    from private.marriage_discovery_actions d
    where d.actor_user_id = p_viewer_user_id
      and d.candidate_user_id = p_candidate_user_id
      and (
        d.action = 'noticed'::public.marriage_discovery_action
        or d.created_at >= clock_timestamp() - interval '14 days'
      )
  ) then
    raise exception 'marriage discovery photo unavailable';
  end if;

  return query
  select
    pp.storage_path,
    case
      when pref.photo_privacy_preference = 'discovery_visible'::public.photo_privacy_preference then 'full'
      when pref.photo_privacy_preference = 'blurred'::public.photo_privacy_preference then 'blurred'
      else 'hidden'
    end
  from public.member_profile_photos pp
  join public.waitlist_applications a on a.user_id = pp.user_id
  join public.waitlist_preferences pref on pref.application_id = a.id
  where pp.id = p_photo_id
    and pp.user_id = p_candidate_user_id
    and pp.review_state = 'approved'::public.member_photo_review_state
    and pref.photo_privacy_preference in (
      'discovery_visible'::public.photo_privacy_preference,
      'blurred'::public.photo_privacy_preference
    )
    and pp.id = (
      select candidate_photo.id
      from public.member_profile_photos candidate_photo
      where candidate_photo.user_id = p_candidate_user_id
        and candidate_photo.review_state = 'approved'::public.member_photo_review_state
      order by candidate_photo.is_primary desc,
               candidate_photo.position,
               candidate_photo.created_at,
               candidate_photo.id
      limit 1
    );

  if not found then
    raise exception 'marriage discovery photo unavailable';
  end if;
end;
$$;

revoke all on function public.resolve_marriage_discovery_photo_path_for_service(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.resolve_marriage_discovery_photo_path_for_service(uuid, uuid, uuid)
  to service_role;
