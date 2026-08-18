# Mithaq release checklist

This checklist is the human companion to `ops/release-contract.json`. The
contract is machine-validated by `pnpm release:contract:check`; this document
captures the operator steps that cannot be proven from source control alone.

## Before any staging or production release

- Confirm CI is green for application checks, production E2E, mobile
  TypeScript/formatting, Expo Doctor, pgTAP, build, and the verified OTP
  journey.
- Confirm `pnpm release:metadata:check` passes so web, mobile, and Expo versions
  agree and native build baselines are valid.
- Confirm `pnpm release:store:check` passes so bundle/package IDs, EAS profiles,
  localized privacy/deletion/support routes, and canonical 1024x1024 native
  artwork remain submission-ready.
- After loading the real hosted environment values, run the matching preflight:
  `pnpm release:preflight:staging` for staging or
  `pnpm release:preflight:production` for production.
- Confirm the target Supabase project is the correct environment and is not
  shared with another release tier.
- Apply reviewed database migrations before deploying web or mobile clients that
  depend on them.
- Confirm the release-readiness RPC reports ready with no blocking maintenance
  workers.
- Confirm the health endpoint identifies only the expected release version,
  deployment tier, and sanitized revision.
- Confirm the deployed web response carries the reviewed CSP and security-header
  baseline.
- Confirm no service-role, secret, database-password, SMS-provider secret, Apple
  credential, or EAS credential is present in client-visible variables or
  committed files.
- Confirm public Supabase variables are the publishable values for the target
  environment.
- Confirm the mobile EAS environment matches its build tier and does not
  reference local `127.0.0.1` services.

## Required environment contract

Each preview, staging, and production deployment declares the following public
values:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Trusted server/worker infrastructure requires `SUPABASE_SERVICE_ROLE_KEY`. It
must never be exposed through `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, mobile source,
browser bundles, logs, screenshots, or support tooling.

Staging and production also require explicit non-secret retention policy values:

- `MITHAQ_CONVERSATION_RETENTION_DAYS`
- `MITHAQ_NOTIFICATION_RETENTION_DAYS`

These values are policy inputs, not source-code defaults. Choose them only after
the applicable product/privacy/legal retention decision has been made. The
hosted preflight and retention workers reject missing, zero, negative, or
non-integer values rather than silently inventing a retention period.

Hosted web/Supabase tiers are preview, staging, and production. EAS itself
supports development, preview, and production environment stores; the internal
EAS `preview` build is therefore Mithaq's mobile staging/acceptance tier and
must point only at `mithaq-staging`. Production EAS values must point only at
the production project.

## Maintenance schedules

Production scheduling should run at least as frequently as the checked-in
release contract:

- `introduction-expiry-worker`: every 15 minutes or faster
- `account-deletion-worker`: every 60 minutes or faster
- `conversation-retention-worker`: every 24 hours or faster
- `notification-retention-worker`: every 24 hours or faster

Each scheduler target is POST-only and must be invoked from trusted
infrastructure with the service-role credential. Do not put that credential in
browser, mobile, public environment, or scheduler URL/query-string fields.

A worker being scheduled is not enough. Before release, run each required worker
once and confirm the database maintenance health/readiness functions show that
required workers have actually run and are not stale beyond the configured
freshness window.

## Staging release

1. Link only the `mithaq-staging` Supabase project.
2. Review `supabase db push --dry-run` output.
3. Apply migrations.
4. Configure hosted staging web variables separately; configure the EAS
   `preview` environment so its mobile public values point only at
   `mithaq-staging`.
5. Set the reviewed conversation and notification retention policy variables in
   trusted worker/runtime configuration.
6. With those real values loaded, run `pnpm release:preflight:staging` and do
   not continue until it passes.
7. Deploy the four maintenance Edge Function entrypoints and configure hosted
   schedules with service-role credentials stored only in the trusted
   scheduler/runtime.
8. Run each required worker once so readiness is based on real successful runs,
   not only configuration.
9. Verify release readiness.
10. Build the web staging deployment and EAS preview build.
11. Set `MITHAQ_RELEASE_BASE_URL` to the hosted staging origin and
    `MITHAQ_EXPECTED_REVISION` to the reviewed commit SHA. Run
    `pnpm release:verify:staging` and do not continue until it passes.
12. Execute real-device acceptance: OTP, onboarding, profile, introduction,
    mutual acceptance, conversation, activity, safety/report/block, privacy
    controls, session restore, biometric lock, and sign-out.

## Production release

1. Use the separate `mithaq-production` Supabase project.
2. Confirm staging passed the same migration set and acceptance path first.
3. Review and apply production migrations.
4. Configure production web/mobile public variables, retention policy variables,
   and trusted server secrets separately from staging.
5. With those real values loaded, run `pnpm release:preflight:production` and do
   not continue until it passes.
6. Deploy the four maintenance Edge Function entrypoints, configure production
   schedules, and verify successful initial runs.
7. Require a clean release-readiness result with no blocking workers.
8. Deploy the reviewed web release.
9. Set `MITHAQ_RELEASE_BASE_URL` to the production origin and
   `MITHAQ_EXPECTED_REVISION` to the reviewed commit SHA. Run
   `pnpm release:verify:production` and do not continue until it passes.
10. Build signed production mobile binaries only from the reviewed release
    commit.
11. Perform final smoke tests against production-safe test accounts.
12. Complete `ops/STORE_SUBMISSION_CHECKLIST.md` against the exact signed
    binaries and hosted production URLs.
13. Submit the reviewed binary to TestFlight / Google Play testing before public
    rollout.
14. Use a staged public rollout and monitor authentication, database errors,
    safety reports, messaging failures, worker health, crash reports, and
    account-deletion backlog.

## External gates still requiring operator credentials

Source control intentionally cannot complete these steps:

- hosted Supabase staging/production project connection
- Apple Developer signing, devices, App Store Connect, and TestFlight
- Google Play signing/console setup
- EAS account/project credentials and environment values
- SMS provider production credentials
- hosted scheduler credentials for maintenance workers
- reviewed retention-policy values for the two retention workers
- external push-notification provider/device-token configuration

Do not weaken source or database security to bypass any of these gates.
