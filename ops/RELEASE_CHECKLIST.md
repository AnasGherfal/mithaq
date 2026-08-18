# Mithaq release checklist

This checklist is the human companion to `ops/release-contract.json`. The
contract is machine-validated by `pnpm release:contract:check`; this document
captures the operator steps that cannot be proven from source control alone.

## Before any staging or production release

- Confirm CI is green for application checks, production E2E, mobile
  TypeScript/formatting, Expo Doctor, pgTAP, build, and the verified OTP
  journey.
- Confirm the target Supabase project is the correct environment and is not
  shared with another release tier.
- Apply reviewed database migrations before deploying web or mobile clients that
  depend on them.
- Confirm the release-readiness RPC reports ready with no blocking maintenance
  workers.
- Confirm no service-role, secret, database-password, SMS-provider secret, Apple
  credential, or EAS credential is present in client-visible variables or
  committed files.
- Confirm public Supabase variables are the publishable values for the target
  environment.
- Confirm the mobile EAS environment matches the target environment and does not
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

## Maintenance schedules

Production scheduling should run at least as frequently as the checked-in
release contract:

- introduction expiry: every 15 minutes or faster
- account deletion worker: every 60 minutes or faster
- closed-conversation message retention: every 24 hours or faster
- read-notification retention: every 24 hours or faster

A worker being scheduled is not enough. Before release, confirm the database
maintenance health/readiness functions show that required workers have actually
run and are not stale beyond the configured freshness window.

## Staging release

1. Link only the `mithaq-staging` Supabase project.
2. Review `supabase db push --dry-run` output.
3. Apply migrations.
4. Configure preview/staging public variables and server secrets in their
   respective hosting/EAS environments.
5. Configure hosted maintenance schedules with service-role credentials stored
   only in the trusted scheduler/runtime.
6. Run each required worker once so readiness is based on real successful runs,
   not only configuration.
7. Verify release readiness.
8. Build the web staging deployment and EAS preview build.
9. Execute real-device acceptance: OTP, onboarding, profile, introduction,
   mutual acceptance, conversation, activity, safety/report/block, privacy
   controls, session restore, biometric lock, and sign-out.

## Production release

1. Use the separate `mithaq-production` Supabase project.
2. Confirm staging passed the same migration set and acceptance path first.
3. Review and apply production migrations.
4. Configure production web/mobile public variables and trusted server secrets
   separately from staging.
5. Configure production maintenance schedules and verify successful initial
   runs.
6. Require a clean release-readiness result with no blocking workers.
7. Build signed production mobile binaries only from the reviewed release
   commit.
8. Perform final smoke tests against production-safe test accounts.
9. Submit the reviewed binary to TestFlight / Google Play testing before public
   rollout.
10. Use a staged public rollout and monitor authentication, database errors,
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
- external push-notification provider/device-token configuration

Do not weaken source or database security to bypass any of these gates.
