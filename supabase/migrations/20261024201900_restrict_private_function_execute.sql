-- Forward-only hardening: PostgreSQL grants EXECUTE on new functions to PUBLIC
-- by default. Revoke any post-foundation private helpers added after the
-- original schema ACL migration. Only owner-executed public RPCs may reach them.
revoke all on all functions in schema private from public, anon, authenticated;
