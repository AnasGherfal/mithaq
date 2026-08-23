begin;
select plan(14);

select is(
  has_table_privilege('authenticated', 'private.member_push_settings', 'SELECT'),
  false,
  'members cannot inspect raw push settings storage'
);

select is(
  has_table_privilege('authenticated', 'private.member_push_devices', 'SELECT'),
  false,
  'members cannot inspect Expo push tokens'
);

select is(
  has_table_privilege('authenticated', 'private.member_push_deliveries', 'SELECT'),
  false,
  'members cannot inspect push delivery queue rows'
);

select is(
  has_table_privilege('authenticated', 'private.push_worker_config', 'SELECT'),
  false,
  'members cannot read the push worker secret or endpoint configuration'
);

select is(
  has_function_privilege('authenticated', 'public.get_my_push_notification_settings()', 'EXECUTE'),
  true,
  'signed-in members can read their guarded notification settings'
);

select is(
  has_function_privilege('authenticated', 'public.set_my_push_notification_settings(boolean,text)', 'EXECUTE'),
  true,
  'signed-in members can change their guarded notification settings'
);

select is(
  has_function_privilege('authenticated', 'public.register_my_expo_push_device(text,text,text)', 'EXECUTE'),
  true,
  'signed-in members can register their own device through the guarded RPC'
);

select is(
  has_function_privilege('authenticated', 'public.unregister_my_push_device(text)', 'EXECUTE'),
  true,
  'signed-in members can unregister their own installation'
);

select is(
  has_function_privilege('anon', 'public.register_my_expo_push_device(text,text,text)', 'EXECUTE'),
  false,
  'anonymous callers cannot register push devices'
);

select is(
  has_function_privilege('authenticated', 'public.claim_member_push_deliveries(text,integer)', 'EXECUTE'),
  false,
  'members cannot claim push deliveries'
);

select is(
  has_function_privilege('authenticated', 'public.finish_member_push_delivery(text,uuid,text,text)', 'EXECUTE'),
  false,
  'members cannot mutate worker delivery outcomes'
);

select is(
  has_function_privilege('authenticated', 'private.invoke_push_worker()', 'EXECUTE'),
  false,
  'members cannot invoke the push worker directly'
);

select ok(
  position(
    'interval ''45 seconds''' in
    pg_get_functiondef('private.enqueue_member_push_delivery()'::regprocedure)
  ) > 0,
  'rapid private-message notifications are coalesced server-side'
);

select ok(
  exists (
    select 1
    from cron.job
    where jobname = 'mithaq-push-delivery-worker'
      and active
      and schedule = '15 seconds'
  ),
  'discreet push worker cron remains active on the expected cadence'
);

select * from finish();
rollback;
