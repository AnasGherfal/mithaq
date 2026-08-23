create table private.marriage_phone_shield_secret (
  singleton boolean primary key default true check (singleton),
  pepper text not null,
  created_at timestamptz not null default clock_timestamp()
);

insert into private.marriage_phone_shield_secret (singleton, pepper)
values (true, encode(gen_random_bytes(32), 'hex'))
on conflict (singleton) do nothing;

revoke all on table private.marriage_phone_shield_secret from public, anon, authenticated;
grant select on table private.marriage_phone_shield_secret to service_role;

create table private.marriage_family_shield (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  phone_hash bytea not null,
  phone_last4 text not null check (phone_last4 ~ '^[0-9]{4}$'),
  created_at timestamptz not null default clock_timestamp(),
  unique (user_id, phone_hash)
);

create index marriage_family_shield_user_created_idx
  on private.marriage_family_shield (user_id, created_at desc);

revoke all on table private.marriage_family_shield from public, anon, authenticated;
grant select, insert, update, delete on table private.marriage_family_shield to service_role;

create or replace function private.normalize_marriage_phone(p_phone text)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
begin
  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'valid international phone number required';
  end if;
  return v_phone;
end;
$$;

create or replace function private.marriage_phone_hash(p_phone text)
returns bytea
language plpgsql
stable
security definer
set search_path = private, extensions, pg_catalog
as $$
declare
  v_phone text := private.normalize_marriage_phone(p_phone);
  v_pepper text;
begin
  select s.pepper into v_pepper
  from private.marriage_phone_shield_secret s
  where s.singleton = true;

  if v_pepper is null then
    raise exception 'privacy service unavailable';
  end if;

  return extensions.digest(v_phone || ':' || v_pepper, 'sha256');
end;
$$;

create or replace function private.member_marriage_phone_hash(p_user_id uuid)
returns bytea
language sql
stable
security definer
set search_path = private, auth
as $$
  select private.marriage_phone_hash(au.phone)
  from auth.users au
  where au.id = p_user_id
    and au.phone is not null;
$$;

create or replace function private.marriage_pair_is_phone_shielded(
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
    from private.marriage_family_shield s
    where (
      s.user_id = p_user_a_id
      and s.phone_hash = private.member_marriage_phone_hash(p_user_b_id)
    ) or (
      s.user_id = p_user_b_id
      and s.phone_hash = private.member_marriage_phone_hash(p_user_a_id)
    )
  );
$$;

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
  select
    private.marriage_pair_is_phone_shielded(p_user_a_id, p_user_b_id)
    or exists (
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
set search_path = private
as $$
  select
    p_viewer_user_id is not null
    and p_candidate_user_id is not null
    and p_viewer_user_id <> p_candidate_user_id
    and not private.marriage_pair_is_hidden(p_viewer_user_id, p_candidate_user_id);
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
    and not private.marriage_pair_is_hidden(p_user_a_id, p_user_b_id)
    and private.member_accepts_partner(p_user_a_id, p_user_b_id)
    and private.member_accepts_partner(p_user_b_id, p_user_a_id);
$$;

revoke all on function private.normalize_marriage_phone(text) from public, anon, authenticated;
revoke all on function private.marriage_phone_hash(text) from public, anon, authenticated;
revoke all on function private.member_marriage_phone_hash(uuid) from public, anon, authenticated;
revoke all on function private.marriage_pair_is_phone_shielded(uuid, uuid) from public, anon, authenticated;
revoke all on function private.marriage_pair_is_hidden(uuid, uuid) from public, anon, authenticated;
revoke all on function private.marriage_discovery_candidate_visible(uuid, uuid) from public, anon, authenticated;
revoke all on function private.members_match_hard_constraints(uuid, uuid) from public, anon, authenticated;
grant execute on function private.normalize_marriage_phone(text) to service_role;
grant execute on function private.marriage_phone_hash(text) to service_role;
grant execute on function private.member_marriage_phone_hash(uuid) to service_role;
grant execute on function private.marriage_pair_is_phone_shielded(uuid, uuid) to service_role;
grant execute on function private.marriage_pair_is_hidden(uuid, uuid) to service_role;
grant execute on function private.marriage_discovery_candidate_visible(uuid, uuid) to service_role;
grant execute on function private.members_match_hard_constraints(uuid, uuid) to service_role;

create or replace function public.add_my_marriage_family_shield(p_phone_e164 text)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_phone text;
  v_hash bytea;
  v_own_hash bytea;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  v_phone := private.normalize_marriage_phone(p_phone_e164);
  v_hash := private.marriage_phone_hash(v_phone);
  v_own_hash := private.member_marriage_phone_hash(v_user_id);

  if v_own_hash is not null and v_hash = v_own_hash then
    raise exception 'use another phone number';
  end if;

  insert into private.marriage_family_shield (
    user_id,
    phone_hash,
    phone_last4
  ) values (
    v_user_id,
    v_hash,
    right(v_phone, 4)
  )
  on conflict (user_id, phone_hash) do update
  set phone_last4 = excluded.phone_last4
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.list_my_marriage_family_shield()
returns table (
  exclusion_id uuid,
  masked_phone text,
  created_at timestamptz
)
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

  return query
  select
    s.id,
    '••••' || s.phone_last4,
    s.created_at
  from private.marriage_family_shield s
  where s.user_id = v_user_id
  order by s.created_at desc, s.id;
end;
$$;

create or replace function public.remove_my_marriage_family_shield(p_exclusion_id uuid)
returns boolean
language plpgsql
security definer
set search_path = private
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  delete from private.marriage_family_shield s
  where s.id = p_exclusion_id
    and s.user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.add_my_marriage_family_shield(text) from public, anon;
revoke all on function public.list_my_marriage_family_shield() from public, anon;
revoke all on function public.remove_my_marriage_family_shield(uuid) from public, anon;
grant execute on function public.add_my_marriage_family_shield(text) to authenticated, service_role;
grant execute on function public.list_my_marriage_family_shield() to authenticated, service_role;
grant execute on function public.remove_my_marriage_family_shield(uuid) to authenticated, service_role;

-- Launch policy: photos are optional. Existing early-preview choices that exposed a
-- portrait in Discover are moved to post-interest disclosure.
update public.waitlist_preferences
set photo_privacy_preference = 'after_mutual_interest'::public.photo_privacy_preference,
    updated_at = clock_timestamp()
where photo_privacy_preference = 'discovery_visible'::public.photo_privacy_preference;

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
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 12 then
    raise exception 'invalid marriage discovery limit';
  end if;
  if not private.marriage_member_is_discoverable(v_user_id) then
    raise exception 'marriage profile required';
  end if;

  select a.current_city
  into v_my_city
  from public.waitlist_applications a
  where a.user_id = v_user_id;

  return query
  with candidate_rows as (
    select
      p.user_id,
      a.current_city as city,
      a.age_band_id,
      age.label as age_band_label,
      a.marital_status,
      a.has_children,
      private.marriage_practical_alignment_reasons(v_user_id, p.user_id) as practical_reasons,
      case
        when v_my_city is not null
         and a.current_city is not null
         and lower(v_my_city) = lower(a.current_city)
          then true
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
    where p.user_id <> v_user_id
      and private.marriage_member_is_discoverable(p.user_id)
      and private.marriage_discovery_candidate_visible(v_user_id, p.user_id)
      and private.members_match_hard_constraints(v_user_id, p.user_id)
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
      case
        when c.same_city then array_prepend('same_city', c.practical_reasons)
        else c.practical_reasons
      end as reasons
    from candidate_rows c
  )
  select
    s.user_id,
    null::text,
    null::text,
    null::text,
    null::text,
    s.city,
    null::text,
    s.age_band_id,
    s.age_band_label,
    s.marital_status,
    s.has_children,
    null::uuid,
    'hidden'::text,
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
