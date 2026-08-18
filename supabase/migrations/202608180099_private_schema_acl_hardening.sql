-- Production hardening: keep the private schema unreachable from browser/mobile roles.
-- Member-facing access must continue to flow through narrow public RPCs whose
-- SECURITY DEFINER owners can reach private state without granting callers
-- direct schema/table/function privileges.

revoke all privileges on schema private from public, anon, authenticated;
revoke all privileges on all tables in schema private from public, anon, authenticated;
revoke all privileges on all sequences in schema private from public, anon, authenticated;
revoke all privileges on all functions in schema private from public, anon, authenticated;
