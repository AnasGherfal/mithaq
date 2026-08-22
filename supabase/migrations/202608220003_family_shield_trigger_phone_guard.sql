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
    and case
      when au.phone ~ '^\+[1-9][0-9]{7,14}$'
        then private.member_marriage_phone_hash(au.id) = new.phone_hash
      else false
    end
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
