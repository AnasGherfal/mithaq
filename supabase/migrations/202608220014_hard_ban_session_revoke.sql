alter table private.member_moderation_enforcements
  add column if not exists previous_auth_banned_until timestamptz,
  add column if not exists auth_sessions_revoked_at timestamptz,
  add column if not exists revoked_session_count integer not null default 0 check (revoked_session_count >= 0),
  add column if not exists revoked_refresh_token_count integer not null default 0 check (revoked_refresh_token_count >= 0);

create or replace function private.current_auth_session_is_active()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_text text := auth.jwt() ->> 'session_id';
  v_session_id uuid;
begin
  if v_user_id is null or v_session_text is null then
    return false;
  end if;

  begin
    v_session_id := v_session_text::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return exists (
    select 1
    from auth.sessions s
    where s.id = v_session_id
      and s.user_id = v_user_id
  );
end;
$$;

create or replace function private.revoke_auth_sessions_for_moderation(p_user_id uuid)
returns table (
  revoked_session_count integer,
  revoked_refresh_token_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sessions integer := 0;
  v_refresh_tokens integer := 0;
begin
  if p_user_id is null then
    raise exception 'moderation session target required';
  end if;

  update auth.refresh_tokens rt
  set revoked = true,
      updated_at = clock_timestamp()
  where rt.user_id = p_user_id::text
    and not coalesce(rt.revoked, false);
  get diagnostics v_refresh_tokens = row_count;

  delete from auth.sessions s
  where s.user_id = p_user_id;
  get diagnostics v_sessions = row_count;

  return query select v_sessions, v_refresh_tokens;
end;
$$;

create or replace function private.current_moderation_role()
returns text
language sql
stable
security definer
set search_path = private, public
as $$
  select staff.role
  from private.moderation_staff staff
  join public.users u on u.id = staff.user_id
  where staff.user_id = auth.uid()
    and staff.active
    and u.account_status = 'active'::public.account_status
    and private.current_auth_session_is_active();
$$;

create or replace function private.member_can_participate(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.users u
    join public.waitlist_applications a on a.user_id = u.id
    join public.member_profiles p on p.user_id = u.id
    join public.member_profile_reviews r on r.user_id = u.id
    where u.id = p_user_id
      and u.account_status = 'active'
      and a.status in ('submitted', 'qualified', 'invited')
      and a.questionnaire_completed_at is not null
      and a.submitted_at is not null
      and p.profile_completed_at is not null
      and r.state = 'approved'::public.member_profile_review_state
      and coalesce(
        (
          select s.state
          from public.member_safety_states s
          where s.user_id = u.id
        ),
        'clear'::public.member_safety_state
      ) = 'clear'::public.member_safety_state
      and (
        auth.uid() is null
        or auth.uid() <> p_user_id
        or private.current_auth_session_is_active()
      )
  );
$$;

create or replace function public.moderate_member_enforcement(
  p_user_id uuid,
  p_action text,
  p_reason_code text default null,
  p_review_after timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.current_moderation_role();
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_reason text := nullif(btrim(coalesce(p_reason_code, '')), '');
  v_previous text;
  v_previous_auth_ban timestamptz;
  v_account_status public.account_status;
  v_auth_banned_until timestamptz;
  v_revoked_sessions integer := 0;
  v_revoked_refresh_tokens integer := 0;
  v_revoked_at timestamptz;
begin
  if not private.moderation_role_can_enforce(v_role) then
    raise exception 'moderation enforcement access required';
  end if;

  if p_user_id is null
     or p_user_id = v_actor
     or v_action not in ('restrict', 'suspend', 'ban', 'restore')
     or (v_action <> 'restore' and (v_reason is null or char_length(v_reason) > 80))
     or (v_reason is not null and char_length(v_reason) > 80) then
    raise exception 'invalid moderation enforcement';
  end if;

  select u.account_status, au.banned_until
  into v_account_status, v_auth_banned_until
  from public.users u
  join auth.users au on au.id = u.id
  where u.id = p_user_id
  for update of u, au;

  if not found or v_account_status in ('deletion_pending', 'deleted') then
    raise exception 'member unavailable for moderation';
  end if;

  select enforcement.enforcement_kind, enforcement.previous_auth_banned_until
  into v_previous, v_previous_auth_ban
  from private.member_moderation_enforcements enforcement
  where enforcement.user_id = p_user_id
  for update;

  if v_action = 'restore' then
    if v_previous is null then
      return false;
    end if;

    if v_previous = 'banned' then
      update auth.users
      set banned_until = v_previous_auth_ban,
          updated_at = clock_timestamp()
      where id = p_user_id;

      if v_account_status = 'suspended'::public.account_status then
        update public.users
        set account_status = 'active'::public.account_status,
            updated_at = clock_timestamp()
        where id = p_user_id;
      end if;
    end if;

    perform public.set_member_safety_state(
      p_user_id,
      'clear'::public.member_safety_state,
      null,
      left('moderator:' || v_actor::text, 120),
      null
    );

    delete from private.member_moderation_enforcements
    where user_id = p_user_id;

    perform private.record_moderation_action(
      v_actor,
      v_role,
      'member_restored',
      'member',
      p_user_id,
      p_user_id,
      v_reason,
      jsonb_build_object(
        'previousEnforcement', v_previous,
        'authBanRestored', v_previous = 'banned'
      )
    );
    return true;
  end if;

  if v_previous = 'banned' and v_action <> 'ban' then
    update auth.users
    set banned_until = v_previous_auth_ban,
        updated_at = clock_timestamp()
    where id = p_user_id;

    if v_account_status = 'suspended'::public.account_status then
      update public.users
      set account_status = 'active'::public.account_status,
          updated_at = clock_timestamp()
      where id = p_user_id;
      v_account_status := 'active'::public.account_status;
    end if;
  end if;

  perform public.set_member_safety_state(
    p_user_id,
    case
      when v_action = 'restrict' then 'restricted'::public.member_safety_state
      else 'suspended'::public.member_safety_state
    end,
    v_reason,
    left('moderator:' || v_actor::text, 120),
    p_review_after
  );

  if v_action = 'ban' then
    if v_previous <> 'banned' or v_previous is null then
      v_previous_auth_ban := v_auth_banned_until;
    end if;

    update auth.users
    set banned_until = case
          when banned_until is null
            or banned_until < clock_timestamp() + interval '100 years'
            then clock_timestamp() + interval '100 years'
          else banned_until
        end,
        updated_at = clock_timestamp()
    where id = p_user_id;

    select revoked.revoked_session_count, revoked.revoked_refresh_token_count
    into v_revoked_sessions, v_revoked_refresh_tokens
    from private.revoke_auth_sessions_for_moderation(p_user_id) revoked;
    v_revoked_at := clock_timestamp();

    update public.users
    set account_status = 'suspended'::public.account_status,
        updated_at = clock_timestamp()
    where id = p_user_id;
  end if;

  insert into private.member_moderation_enforcements (
    user_id,
    enforcement_kind,
    reason_code,
    review_after,
    actor_user_id,
    applied_at,
    updated_at,
    previous_auth_banned_until,
    auth_sessions_revoked_at,
    revoked_session_count,
    revoked_refresh_token_count
  ) values (
    p_user_id,
    case v_action
      when 'restrict' then 'restricted'
      when 'suspend' then 'suspended'
      else 'banned'
    end,
    v_reason,
    p_review_after,
    v_actor,
    clock_timestamp(),
    clock_timestamp(),
    case when v_action = 'ban' then v_previous_auth_ban else null end,
    case when v_action = 'ban' then v_revoked_at else null end,
    case when v_action = 'ban' then v_revoked_sessions else 0 end,
    case when v_action = 'ban' then v_revoked_refresh_tokens else 0 end
  )
  on conflict (user_id) do update
  set enforcement_kind = excluded.enforcement_kind,
      reason_code = excluded.reason_code,
      review_after = excluded.review_after,
      actor_user_id = excluded.actor_user_id,
      updated_at = excluded.updated_at,
      previous_auth_banned_until = excluded.previous_auth_banned_until,
      auth_sessions_revoked_at = excluded.auth_sessions_revoked_at,
      revoked_session_count = excluded.revoked_session_count,
      revoked_refresh_token_count = excluded.revoked_refresh_token_count;

  perform private.close_member_relationships_for_moderation(p_user_id, v_actor, v_role);

  perform private.record_moderation_action(
    v_actor,
    v_role,
    'member_' || v_action,
    'member',
    p_user_id,
    p_user_id,
    v_reason,
    jsonb_build_object(
      'previousEnforcement', v_previous,
      'reviewAfter', p_review_after,
      'revokedSessions', v_revoked_sessions,
      'revokedRefreshTokens', v_revoked_refresh_tokens,
      'authSessionsRevokedAt', v_revoked_at
    )
  );

  return true;
end;
$$;

revoke all on function private.current_auth_session_is_active() from public, anon, authenticated;
revoke all on function private.revoke_auth_sessions_for_moderation(uuid) from public, anon, authenticated;
grant execute on function private.current_auth_session_is_active() to service_role;
grant execute on function private.revoke_auth_sessions_for_moderation(uuid) to service_role;
