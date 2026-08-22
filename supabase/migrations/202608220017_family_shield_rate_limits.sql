create policy "friendship profiles disabled at launch"
on public.friendship_profiles
for select
to authenticated
using (false);

create index if not exists marriage_family_shield_user_time_idx
  on private.marriage_family_shield (user_id, created_at desc, id);

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
  v_total integer;
  v_recent integer;
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

  perform pg_advisory_xact_lock(hashtextextended('family-shield:' || v_user_id::text, 0));

  select shield.id
  into v_id
  from private.marriage_family_shield shield
  where shield.user_id = v_user_id
    and shield.phone_hash = v_hash;

  if v_id is not null then
    return v_id;
  end if;

  select count(*)::integer
  into v_total
  from private.marriage_family_shield shield
  where shield.user_id = v_user_id;

  if v_total >= 40 then
    raise exception 'family shield limit reached';
  end if;

  select count(*)::integer
  into v_recent
  from private.marriage_family_shield shield
  where shield.user_id = v_user_id
    and shield.created_at >= clock_timestamp() - interval '1 hour';

  if v_recent >= 12 then
    raise exception 'family shield add rate limit reached';
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
  returning id into v_id;

  return v_id;
end;
$$;
