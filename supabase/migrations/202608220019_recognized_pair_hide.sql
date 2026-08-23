-- Reciprocal fallback when a member recognizes someone after identity is visible.
-- One member's private hide removes the pair from future Marriage visibility in
-- both directions and closes any already-active introduction/conversation.

create or replace function private.close_active_pair_for_recognition_hide(
  p_user_a_id uuid,
  p_user_b_id uuid,
  p_actor_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_introduction record;
  v_conversation_id uuid;
  v_closed_count integer := 0;
begin
  if p_user_a_id is null or p_user_b_id is null or p_user_a_id = p_user_b_id then
    return 0;
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
        (i.user_a_id = p_user_a_id and i.user_b_id = p_user_b_id)
        or
        (i.user_a_id = p_user_b_id and i.user_b_id = p_user_a_id)
      )
    returning i.id
  loop
    v_closed_count := v_closed_count + 1;
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
        p_actor_user_id
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
      p_actor_user_id,
      'recognized-pair-hide'
    );
  end loop;

  return v_closed_count;
end;
$$;

revoke all on function private.close_active_pair_for_recognition_hide(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.close_active_pair_for_recognition_hide(uuid, uuid, uuid)
  to service_role;

create or replace function private.close_active_pair_after_discovery_hide()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.close_active_pair_for_recognition_hide(
    new.actor_user_id,
    new.hidden_user_id,
    new.actor_user_id
  );
  return new;
end;
$$;

revoke all on function private.close_active_pair_after_discovery_hide()
  from public, anon, authenticated;
grant execute on function private.close_active_pair_after_discovery_hide()
  to service_role;

drop trigger if exists marriage_discovery_hide_closes_active_pair
  on private.marriage_discovery_hides;
create trigger marriage_discovery_hide_closes_active_pair
after insert on private.marriage_discovery_hides
for each row execute function private.close_active_pair_after_discovery_hide();

-- Reconcile any pair that was hidden before this lifecycle guard existed.
do $$
declare
  v_hide record;
begin
  for v_hide in
    select h.actor_user_id, h.hidden_user_id
    from private.marriage_discovery_hides h
  loop
    perform private.close_active_pair_for_recognition_hide(
      v_hide.actor_user_id,
      v_hide.hidden_user_id,
      v_hide.actor_user_id
    );
  end loop;
end;
$$;

create or replace function public.hide_recognized_introduction_member(
  p_introduction_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_target_user_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'::public.account_status
  ) then
    raise exception 'account unavailable';
  end if;

  v_target_user_id := private.introduction_counterpart(p_introduction_id, v_user_id);
  if v_target_user_id is null then
    raise exception 'introduction unavailable';
  end if;

  insert into private.marriage_discovery_hides (actor_user_id, hidden_user_id)
  values (v_user_id, v_target_user_id)
  on conflict (actor_user_id, hidden_user_id) do nothing;

  -- Recognition means the actor no longer wants any saved discovery signal for
  -- this pair. Never alter the other member's private history or notify them.
  delete from private.marriage_discovery_actions d
  where d.actor_user_id = v_user_id
    and d.candidate_user_id = v_target_user_id;

  -- Also covers a pre-existing hide row created before the trigger was added.
  perform private.close_active_pair_for_recognition_hide(
    v_user_id,
    v_target_user_id,
    v_user_id
  );

  return true;
end;
$$;

revoke all on function public.hide_recognized_introduction_member(uuid)
  from public, anon;
grant execute on function public.hide_recognized_introduction_member(uuid)
  to authenticated, service_role;
