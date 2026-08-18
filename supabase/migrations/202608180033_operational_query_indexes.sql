-- Production hardening for the hot paths exercised on every message send and
-- during safety-aware retention. These indexes do not change member-visible
-- behavior or data disclosure; they keep guarded RPCs predictable as data grows.

create index if not exists conversation_messages_sender_rate_idx
  on private.conversation_messages (conversation_id, sender_user_id, sent_at desc);

create index if not exists safety_reports_open_reporter_target_idx
  on public.safety_reports (reporter_user_id, target_user_id)
  where status not in (
    'dismissed'::public.safety_report_status,
    'closed'::public.safety_report_status
  );

create index if not exists safety_reports_open_target_reporter_idx
  on public.safety_reports (target_user_id, reporter_user_id)
  where status not in (
    'dismissed'::public.safety_report_status,
    'closed'::public.safety_report_status
  );
