create index member_push_deliveries_device_idx
  on private.member_push_deliveries (device_id, created_at desc);
