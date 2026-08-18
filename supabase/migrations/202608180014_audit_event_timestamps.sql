-- Audit events must preserve event order even when multiple transitions happen
-- inside the same transaction. `now()` is transaction-stable in PostgreSQL,
-- which made distinct audit events share the same timestamp and left callers
-- relying on UUID ordering. Use wall-clock timestamps for new audit events.

alter table private.safety_report_events
  alter column recorded_at set default clock_timestamp();

alter table private.member_profile_review_events
  alter column recorded_at set default clock_timestamp();
