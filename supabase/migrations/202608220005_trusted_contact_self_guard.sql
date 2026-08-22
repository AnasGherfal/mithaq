create or replace function public.save_my_marriage_trusted_contact(
  p_contact_id uuid,
  p_display_name text,
  p_relationship text,
  p_phone_e164 text
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_display_name, ''));
  v_phone text;
  v_phone_digits text;
  v_own_phone_digits text;
  v_contact_id uuid;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'trusted contact name required';
  end if;

  if p_relationship not in (
    'father',
    'mother',
    'brother',
    'sister',
    'wali_guardian',
    'relative',
    'trusted_person',
    'other'
  ) then
    raise exception 'trusted contact relationship required';
  end if;

  v_phone := private.normalize_marriage_phone(p_phone_e164);
  v_phone_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');

  select regexp_replace(coalesce(au.phone, ''), '[^0-9]', '', 'g')
  into v_own_phone_digits
  from auth.users au
  where au.id = v_user_id;

  if nullif(v_own_phone_digits, '') is not null
     and v_phone_digits = v_own_phone_digits then
    raise exception 'trusted contact must be another person';
  end if;

  if p_contact_id is null then
    select count(*)::integer
    into v_count
    from private.marriage_trusted_contacts c
    where c.user_id = v_user_id;

    if v_count >= 3 then
      raise exception 'trusted contact limit reached';
    end if;

    insert into private.marriage_trusted_contacts (
      user_id,
      display_name,
      relationship,
      phone_e164
    ) values (
      v_user_id,
      v_name,
      p_relationship,
      v_phone
    )
    returning id into v_contact_id;
  else
    update private.marriage_trusted_contacts c
    set display_name = v_name,
        relationship = p_relationship,
        phone_e164 = v_phone,
        updated_at = clock_timestamp()
    where c.id = p_contact_id
      and c.user_id = v_user_id
    returning c.id into v_contact_id;

    if v_contact_id is null then
      raise exception 'trusted contact unavailable';
    end if;
  end if;

  return v_contact_id;
end;
$$;

revoke all on function public.save_my_marriage_trusted_contact(uuid, text, text, text)
  from public, anon;
grant execute on function public.save_my_marriage_trusted_contact(uuid, text, text, text)
  to authenticated, service_role;
