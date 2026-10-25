-- Historical Stage F migration mirrored from mithaq-staging.
-- The underlying conversation notification function and original trigger were
-- created before the application repository contained the full schema history.

create trigger conversation_message_received_notification
after insert on private.conversation_messages
for each row
execute function private.notify_conversation_message_received();
