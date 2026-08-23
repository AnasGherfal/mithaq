create or replace function private.member_open_conversation_id(
  p_introduction_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_conversation_id uuid;
  v_other_user_id uuid;
begin
  if p_introduction_id is null or p_user_id is null then
    return null;
  end if;

  select
    c.id,
    case
      when c.user_a_id = p_user_id then c.user_b_id
      when c.user_b_id = p_user_id then c.user_a_id
      else null
    end
  into v_conversation_id, v_other_user_id
  from private.introduction_conversations c
  join private.controlled_introductions i on i.id = c.introduction_id
  where c.introduction_id = p_introduction_id
    and c.status = 'open'::public.conversation_status
    and i.status = 'mutually_accepted'::public.introduction_status;

  if v_conversation_id is null or v_other_user_id is null then
    return null;
  end if;

  if private.members_are_blocked(p_user_id, v_other_user_id)
     or private.marriage_pair_is_hidden(p_user_id, v_other_user_id)
     or not private.member_can_participate(p_user_id)
     or not private.member_can_participate(v_other_user_id) then
    return null;
  end if;

  return v_conversation_id;
end;
$$;

revoke all on function private.member_open_conversation_id(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.member_open_conversation_id(uuid, uuid)
  to service_role;

create or replace function public.open_my_conversation(
  p_introduction_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_row private.controlled_introductions%rowtype;
  v_conversation_id uuid;
  v_status public.conversation_status;
  v_inserted integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select *
  into v_row
  from private.controlled_introductions i
  where i.id = p_introduction_id;

  if not found or (v_row.user_a_id <> v_user_id and v_row.user_b_id <> v_user_id) then
    raise exception 'conversation unavailable';
  end if;

  if v_row.status <> 'mutually_accepted'::public.introduction_status
     or private.members_are_blocked(v_row.user_a_id, v_row.user_b_id)
     or private.marriage_pair_is_hidden(v_row.user_a_id, v_row.user_b_id)
     or not private.member_can_participate(v_row.user_a_id)
     or not private.member_can_participate(v_row.user_b_id) then
    raise exception 'conversation unavailable';
  end if;

  insert into private.introduction_conversations (
    introduction_id,
    user_a_id,
    user_b_id
  ) values (
    v_row.id,
    v_row.user_a_id,
    v_row.user_b_id
  )
  on conflict (introduction_id) do nothing;

  get diagnostics v_inserted = row_count;

  select c.id, c.status
  into v_conversation_id, v_status
  from private.introduction_conversations c
  where c.introduction_id = v_row.id;

  if v_conversation_id is null or v_status <> 'open'::public.conversation_status then
    raise exception 'conversation unavailable';
  end if;

  if v_inserted = 1 then
    insert into private.conversation_events (
      conversation_id,
      event_type,
      actor_user_id
    ) values (
      v_conversation_id,
      'opened',
      v_user_id
    );
  end if;

  return v_conversation_id;
end;
$$;

revoke all on function public.open_my_conversation(uuid)
  from public, anon;
grant execute on function public.open_my_conversation(uuid)
  to authenticated, service_role;

create or replace function private.close_active_pair_after_family_shield()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_target_user_id uuid;
  v_introduction record;
  v_conversation_id uuid;
begin
  select au.id
  into v_target_user_id
  from auth.users au
  where au.id <> new.user_id
    and au.phone is not null
    and private.member_marriage_phone_hash(au.id) = new.phone_hash
  limit 1;

  if v_target_user_id is null then
    return new;
  end if;

  for v_introduction in
    update private.controlled_introductions i
    set status = 'cancelled'::public.introduction_status,
        closed_at = clock_timestamp()
    where i.status in (
      'offered'::public.introduction_status,
      'mutually_accepted'::public.introduction_status
    )
      and (
        (i.user_a_id = new.user_id and i.user_b_id = v_target_user_id)
        or
        (i.user_a_id = v_target_user_id and i.user_b_id = new.user_id)
      )
    returning i.id
  loop
    v_conversation_id := null;

    update private.introduction_conversations c
    set status = 'closed'::public.conversation_status,
        closed_at = clock_timestamp()
    where c.introduction_id = v_introduction.id
      and c.status = 'open'::public.conversation_status
    returning c.id into v_conversation_id;

    if v_conversation_id is not null then
      insert into private.conversation_events (
        conversation_id,
        event_type,
        actor_user_id
      ) values (
        v_conversation_id,
        'closed',
        new.user_id
      );
    end if;

    insert into private.controlled_introduction_events (
      introduction_id,
      event_type,
      actor_user_id,
      actor_reference
    ) values (
      v_introduction.id,
      'cancelled',
      new.user_id,
      'family-shield'
    );
  end loop;

  return new;
end;
$$;

revoke all on function private.close_active_pair_after_family_shield()
  from public, anon, authenticated;
grant execute on function private.close_active_pair_after_family_shield()
  to service_role;

drop trigger if exists marriage_family_shield_closes_active_pair
  on private.marriage_family_shield;
create trigger marriage_family_shield_closes_active_pair
after insert on private.marriage_family_shield
for each row execute function private.close_active_pair_after_family_shield();
