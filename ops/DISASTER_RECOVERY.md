# Mithaq disaster recovery

This runbook defines the minimum recovery process for Mithaq database releases.
It contains no credentials, project references, backup files, or member data.
Hosted backup configuration and restore execution remain operator-controlled.

## Recovery principles

- Treat the hosted Supabase backup/restore capability as infrastructure, not as a
  substitute for tested application migrations and authorization controls.
- Restore rehearsals must use a separate non-production project. Never test a
  destructive recovery procedure against the live production project.
- Keep staging and production projects, credentials, backup policies, and
  release histories separate.
- Never copy production member data into developer laptops, CI artifacts,
  screenshots, support tickets, or public logs for a recovery test.
- A successful database restore is not sufficient by itself. Re-run application
  smoke tests, RLS/security checks, maintenance readiness, and the verified
  member journey against the recovered environment.

## Before production launch

1. Confirm the production Supabase plan provides an acceptable backup retention
   policy for the business. Choose PITR only after the operator explicitly
   approves the required recovery window and cost.
2. Record the chosen recovery-point and recovery-time objectives in the private
   operations system. Do not guess those business values in source control.
3. Confirm a separate staging/recovery project can be created without sharing
   production credentials.
4. Confirm the latest reviewed migration set is available from source control.
5. Perform at least one restore rehearsal into a non-production project using a
   supported Supabase backup/restore path.
6. Validate the restored project before treating the rehearsal as successful.

## Restore rehearsal validation

After restoration into an isolated project:

- confirm expected migrations and application tables are present;
- run pgTAP security and behavior suites against the restored schema where
  supported;
- verify RLS and private-schema access boundaries;
- verify authentication with recovery-safe test accounts rather than real
  member credentials;
- run the OTP/waitlist integration path using the staging/test provider setup;
- verify controlled introductions, conversations, activity, safety actions, and
  privacy controls with test data;
- run required maintenance workers and confirm the release-readiness gate is
  clean;
- verify the web health endpoint reports the intended release identity;
- verify CSP/security headers and application smoke tests;
- record the rehearsal result and any manual steps in the private operations
  system.

## Recovery event procedure

1. Stop or restrict writes if continuing traffic can worsen corruption or data
   loss.
2. Identify the incident window and the last known-good recovery point.
3. Preserve relevant security/moderation evidence before destructive actions if
   the incident intersects an unresolved safety investigation.
4. Choose the supported backup or PITR recovery point immediately before the
   bad change or corruption event.
5. Prefer recovery into a new isolated project when the incident allows it so
   the recovered state can be validated before traffic moves.
6. Reapply required non-database configuration that backups do not restore.
7. Run the restore rehearsal validation checklist above.
8. Only reconnect member traffic after authorization boundaries, critical
   member journeys, maintenance workers, and release identity are verified.
9. Document the incident, actual data-loss window, downtime, and follow-up
   prevention work in the private operations system.

## Logical exports

A manual logical export can be useful for migration or an additional recovery
copy, but it must be handled as sensitive production data. Use the supported
Supabase CLI/`pg_dump` process with credentials supplied only at execution time.
Do not commit dumps, upload them as CI artifacts, or place them in normal support
storage.

Database backups do not cover future Supabase Storage object contents. If Mithaq
later enables profile photos or identity documents, the recovery plan must be
expanded and tested for Storage objects before those features can be considered
production-ready.

## External actions required

The following cannot be completed from source control alone:

- selecting the production Supabase plan/backup retention and optional PITR;
- creating the isolated recovery/staging project;
- accessing hosted backups or PITR restore controls;
- supplying database/service credentials to trusted recovery tooling;
- executing and recording the hosted restore rehearsal;
- approving business RPO/RTO targets.
