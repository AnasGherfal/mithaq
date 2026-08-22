create table private.marriage_trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  relationship text not null check (
    relationship in (
      'father',
      'mother',
      'brother',
      'sister',
      'wali_guardian',
      'relative',
      'trusted_person',
      'other'
    )
  ),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (user_id, phone_e164)
);

create index marriage_trusted_contacts_user_time_idx
  on private.marriage_trusted_contacts (user_id, created_at, id);

revoke all on table private.marriage_trusted_contacts from public, anon, authenticated;
grant select, insert, update, delete on table private.marriage_trusted_contacts to service_role;

create table private.introduction_trusted_contact_shares (
  introduction_id uuid not null references private.controlled_introductions(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  source_contact_id uuid references private.marriage_trusted_contacts(id) on delete set null,
  contact_name text not null check (char_length(btrim(contact_name)) between 1 and 80),
  relationship text not null check (
    relationship in (
      'father',
      'mother',
      'brother',
      'sister',
      'wali_guardian',
      'relative',
      'trusted_person',
      'other'
    )
  ),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  shared_at timestamptz not null default clock_timestamp(),
  primary key (introduction_id, owner_user_id)
);

create index introduction_trusted_contact_owner_time_idx
  on private.introduction_trusted_contact_shares (owner_user_id, shared_at desc);

revoke all on table private.introduction_trusted_contact_shares from public, anon, authenticated;
grant select, insert, update, delete on table private.introduction_trusted_contact_shares to service_role;

create or replace function private.introduction_member_trusted_contact_shared(
  p_introduction_id uuid,
  p_owner_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = private
as $$
  select exists (
    select 1
    from private.introduction_trusted_contact_shares s
    where s.introduction_id = p_introduction_id
      and s.owner_user_id = p_owner_user_id
  );
$$;

revoke all on function private.introduction_member_trusted_contact_shared(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.introduction_member_trusted_contact_shared(uuid, uuid)
  to service_role;

create or replace function public.list_my_marriage_trusted_contacts()
returns table (
  contact_id uuid,
  display_name text,
  relationship text,
  phone_e164 text,
  created_at timestamptz,
  updated_at timestamptz
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

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  return query
  select
    c.id,
    c.display_name,
    c.relationship,
    c.phone_e164,
    c.created_at,
    c.updated_at
  from private.marriage_trusted_contacts c
  where c.user_id = v_user_id
  order by c.created_at, c.id;
end;
$$;

create or replace function public.save_my_marriage_trusted_contact(
  p_contact_id uuid,
  p_display_name text,
  p_relationship text,
  p_phone_e164 text
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_display_name, ''));
  v_phone text;
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

create or replace function public.remove_my_marriage_trusted_contact(
  p_contact_id uuid
)
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

  delete from private.marriage_trusted_contacts c
  where c.id = p_contact_id
    and c.user_id = v_user_id;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

create or replace function public.get_my_introduction_trusted_contact_state(
  p_introduction_id uuid
)
returns table (
  my_shared boolean,
  my_contact_name text,
  my_relationship text,
  my_phone_e164 text,
  my_shared_at timestamptz,
  other_shared boolean,
  other_contact_name text,
  other_relationship text,
  other_phone_e164 text,
  other_shared_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_other_user_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select case
    when i.user_a_id = v_user_id then i.user_b_id
    when i.user_b_id = v_user_id then i.user_a_id
    else null
  end
  into v_other_user_id
  from private.controlled_introductions i
  where i.id = p_introduction_id
    and i.status = 'mutually_accepted'::public.introduction_status;

  if v_other_user_id is null
     or private.members_are_blocked(v_user_id, v_other_user_id)
     or private.marriage_pair_is_hidden(v_user_id, v_other_user_id)
     or not private.member_can_participate(v_user_id)
     or not private.member_can_participate(v_other_user_id) then
    raise exception 'trusted contact handoff unavailable';
  end if;

  return query
  select
    mine.introduction_id is not null,
    mine.contact_name,
    mine.relationship,
    mine.phone_e164,
    mine.shared_at,
    theirs.introduction_id is not null,
    theirs.contact_name,
    theirs.relationship,
    theirs.phone_e164,
    theirs.shared_at
  from (select 1) seed
  left join private.introduction_trusted_contact_shares mine
    on mine.introduction_id = p_introduction_id
   and mine.owner_user_id = v_user_id
  left join private.introduction_trusted_contact_shares theirs
    on theirs.introduction_id = p_introduction_id
   and theirs.owner_user_id = v_other_user_id;
end;
$$;

create or replace function public.share_my_trusted_contact_for_introduction(
  p_introduction_id uuid,
  p_contact_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_other_user_id uuid;
  v_contact private.marriage_trusted_contacts%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select case
    when i.user_a_id = v_user_id then i.user_b_id
    when i.user_b_id = v_user_id then i.user_a_id
    else null
  end
  into v_other_user_id
  from private.controlled_introductions i
  where i.id = p_introduction_id
    and i.status = 'mutually_accepted'::public.introduction_status;

  if v_other_user_id is null
     or private.members_are_blocked(v_user_id, v_other_user_id)
     or private.marriage_pair_is_hidden(v_user_id, v_other_user_id)
     or not private.member_can_participate(v_user_id)
     or not private.member_can_participate(v_other_user_id) then
    raise exception 'trusted contact handoff unavailable';
  end if;

  select *
  into v_contact
  from private.marriage_trusted_contacts c
  where c.id = p_contact_id
    and c.user_id = v_user_id;

  if not found then
    raise exception 'trusted contact unavailable';
  end if;

  insert into private.introduction_trusted_contact_shares (
    introduction_id,
    owner_user_id,
    source_contact_id,
    contact_name,
    relationship,
    phone_e164,
    shared_at
  ) values (
    p_introduction_id,
    v_user_id,
    v_contact.id,
    v_contact.display_name,
    v_contact.relationship,
    v_contact.phone_e164,
    clock_timestamp()
  )
  on conflict (introduction_id, owner_user_id) do nothing;

  return true;
end;
$$;

revoke all on function public.list_my_marriage_trusted_contacts() from public, anon;
revoke all on function public.save_my_marriage_trusted_contact(uuid, text, text, text) from public, anon;
revoke all on function public.remove_my_marriage_trusted_contact(uuid) from public, anon;
revoke all on function public.get_my_introduction_trusted_contact_state(uuid) from public, anon;
revoke all on function public.share_my_trusted_contact_for_introduction(uuid, uuid) from public, anon;

grant execute on function public.list_my_marriage_trusted_contacts() to authenticated, service_role;
grant execute on function public.save_my_marriage_trusted_contact(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.remove_my_marriage_trusted_contact(uuid) to authenticated, service_role;
grant execute on function public.get_my_introduction_trusted_contact_state(uuid) to authenticated, service_role;
grant execute on function public.share_my_trusted_contact_for_introduction(uuid, uuid) to authenticated, service_role;

create or replace function private.introduction_member_photo_is_revealed(
  p_introduction_id uuid,
  p_owner_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from private.controlled_introductions i
    join public.waitlist_applications a on a.user_id = p_owner_user_id
    join public.waitlist_preferences pref on pref.application_id = a.id
    where i.id = p_introduction_id
      and p_owner_user_id in (i.user_a_id, i.user_b_id)
      and i.status = 'mutually_accepted'::public.introduction_status
      and (
        pref.photo_privacy_preference in (
          'discovery_visible'::public.photo_privacy_preference,
          'blurred'::public.photo_privacy_preference,
          'after_mutual_interest'::public.photo_privacy_preference
        )
        or (
          pref.photo_privacy_preference = 'explicit_approval'::public.photo_privacy_preference
          and exists (
            select 1
            from private.introduction_photo_reveal_consents c
            where c.introduction_id = p_introduction_id
              and c.owner_user_id = p_owner_user_id
          )
        )
        or (
          pref.photo_privacy_preference = 'after_family_involvement'::public.photo_privacy_preference
          and private.introduction_member_trusted_contact_shared(
            p_introduction_id,
            p_owner_user_id
          )
        )
      )
  );
$$;

revoke all on function private.introduction_member_photo_is_revealed(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.introduction_member_photo_is_revealed(uuid, uuid)
  to service_role;
