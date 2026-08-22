create or replace function public.list_my_marriage_activity(
  p_before_occurred_at timestamptz default null,
  p_before_activity_id text default null,
  p_limit integer default 50
)
returns table (
  activity_id text,
  activity_kind text,
  introduction_id uuid,
  introduction_status public.introduction_status,
  occurred_at timestamptz,
  is_unread boolean
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'activity limit must be between 1 and 100';
  end if;

  if (p_before_occurred_at is null) <> (p_before_activity_id is null) then
    raise exception 'activity cursor is incomplete';
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
  with raw_activity as (
    select
      'interest:' || d.id::text as activity_id,
      'interest_saved'::text as activity_kind,
      null::uuid as introduction_id,
      d.created_at as occurred_at,
      false as is_unread
    from private.marriage_discovery_actions d
    where d.actor_user_id = v_user_id
      and d.action = 'noticed'::public.marriage_discovery_action

    union all

    select
      'intro:' || e.id::text,
      case
        when e.event_type = 'created' then 'introduction_offered'
        when e.event_type = 'accepted' then 'my_choice_saved'
        when e.event_type = 'mutually_accepted' then 'mutual_acceptance'
        when e.event_type = 'declined' and e.actor_user_id = v_user_id then 'introduction_closed_by_me'
        when e.event_type = 'declined' then 'introduction_closed'
        when e.event_type = 'expired' then 'introduction_expired'
        when e.event_type = 'cancelled' then 'introduction_closed'
        when e.event_type = 'closed' and e.actor_user_id = v_user_id then 'introduction_closed_by_me'
        when e.event_type = 'closed' then 'introduction_closed'
        else null
      end,
      e.introduction_id,
      e.recorded_at,
      case
        when e.event_type = 'created' then exists (
          select 1
          from private.member_notifications n
          where n.user_id = v_user_id
            and n.introduction_id = e.introduction_id
            and n.kind = 'introduction_offered'
            and n.read_at is null
        )
        when e.event_type = 'mutually_accepted' then exists (
          select 1
          from private.member_notifications n
          where n.user_id = v_user_id
            and n.introduction_id = e.introduction_id
            and n.kind = 'introduction_mutually_accepted'
            and n.read_at is null
        )
        else false
      end
    from private.controlled_introduction_events e
    join private.controlled_introductions i
      on i.id = e.introduction_id
    where v_user_id in (i.user_a_id, i.user_b_id)
      and (
        e.event_type <> 'accepted'
        or e.actor_user_id = v_user_id
      )

    union all

    select
      'conversation:' || e.id::text,
      case
        when e.event_type = 'opened' then 'conversation_started'
        when e.event_type = 'closed' and e.actor_user_id = v_user_id then 'conversation_ended_by_me'
        when e.event_type = 'closed' then 'conversation_closed'
        else null
      end,
      c.introduction_id,
      e.recorded_at,
      false
    from private.conversation_events e
    join private.introduction_conversations c
      on c.id = e.conversation_id
    where v_user_id in (c.user_a_id, c.user_b_id)

    union all

    select
      'photo:' || r.introduction_id::text || ':' || r.owner_user_id::text,
      case
        when r.owner_user_id = v_user_id then 'my_photo_shared'
        else 'photo_shared_with_me'
      end,
      r.introduction_id,
      r.revealed_at,
      false
    from private.introduction_photo_reveal_consents r
    join private.controlled_introductions i
      on i.id = r.introduction_id
    where v_user_id in (i.user_a_id, i.user_b_id)

    union all

    select
      'trusted:' || s.introduction_id::text || ':' || s.owner_user_id::text,
      case
        when s.owner_user_id = v_user_id then 'my_trusted_contact_shared'
        else 'trusted_contact_shared_with_me'
      end,
      s.introduction_id,
      s.shared_at,
      false
    from private.introduction_trusted_contact_shares s
    join private.controlled_introductions i
      on i.id = s.introduction_id
    where v_user_id in (i.user_a_id, i.user_b_id)

    union all

    select
      'message:' || n.id::text,
      'message_received'::text,
      n.introduction_id,
      n.created_at,
      n.read_at is null
    from private.member_notifications n
    where n.user_id = v_user_id
      and n.kind = 'message_received'
  ), visible_activity as (
    select
      a.activity_id,
      a.activity_kind,
      a.introduction_id,
      a.occurred_at,
      a.is_unread
    from raw_activity a
    where a.activity_kind is not null
      and (
        p_before_occurred_at is null
        or a.occurred_at < p_before_occurred_at
        or (
          a.occurred_at = p_before_occurred_at
          and a.activity_id < p_before_activity_id
        )
      )
  )
  select
    a.activity_id,
    a.activity_kind,
    a.introduction_id,
    i.status,
    a.occurred_at,
    a.is_unread
  from visible_activity a
  left join private.controlled_introductions i
    on i.id = a.introduction_id
  order by a.occurred_at desc, a.activity_id desc
  limit p_limit;
end;
$$;

revoke all on function public.list_my_marriage_activity(timestamptz, text, integer)
  from public, anon;
grant execute on function public.list_my_marriage_activity(timestamptz, text, integer)
  to authenticated, service_role;
