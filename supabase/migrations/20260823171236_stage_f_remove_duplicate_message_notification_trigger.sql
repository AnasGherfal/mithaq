-- Keep the original conversation_message_notification trigger and remove the
-- duplicate trigger added by the first repository-era Stage F migration.
-- Both triggers called the same notification function for every inserted
-- message, so retaining both only duplicated database work.

drop trigger if exists conversation_message_received_notification
on private.conversation_messages;
