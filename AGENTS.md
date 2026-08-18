# Agent instructions

## Product boundary

Mithaq is a serious, privacy-conscious marriage-introduction product, not a
casual dating or entertainment application. Preserve the calm, culturally
respectful visual language. Do not introduce hearts, flames, swiping, popularity
mechanics, manipulative engagement patterns, public member directories, or
unsupported claims of identity verification.

## Current scope

The repository is in **M9 — Production hardening**. M1 through M8 are complete
foundations and their security/privacy contracts must remain intact. Continue M9
in roadmap order: fix regressions first, preserve existing contracts, then take
the highest-value independent production-readiness slice.

Do not use M9 to expand product scope. Profile photos, identity/liveness
verification, payments, full admin analytics/moderation tooling, external push
delivery, and other deferred capabilities remain outside the current independent
implementation path unless explicitly authorized by the roadmap.

Hosted Supabase staging/production connection, Apple/Google signing and store
access, EAS account/environment values, SMS-provider production credentials,
external push credentials, and hosted worker scheduling require operator-owned
credentials. Never invent or commit those values; continue independent work when
those gates are unavailable.

## Engineering rules

- Keep TypeScript strict; do not add `any`, broad casts, `@ts-ignore`, or
  disabled lint rules merely to pass checks.
- Prefer Server Components on the web. Add Client Components only around actual
  browser interaction.
- Keep Arabic RTL and English behavior/copy at parity.
- Preserve always-prefixed web locale routing and Arabic as the deterministic
  default.
- Use logical start/end styling rather than physical left/right styling when
  direction matters.
- Never expose Supabase secret/service-role keys to browser or mobile clients.
- Do not log phone numbers, tokens, OTPs, cookies, profile answers, message
  bodies, or other private member data.
- Treat RLS and server authorization as independent required controls.
- Keep sensitive matching, moderation, introduction, conversation, message,
  notification, and worker-audit rows private; expose cross-user data only
  through narrow reviewed RPCs.
- Do not add runtime PWA caching for APIs, Supabase, authenticated routes, or
  user data.
- Preserve preview/staging/production separation and the checked-in release
  contract.
- Add or update tests with every behavior change.
- Keep GitHub Actions pinned to reviewed immutable commit SHAs.
- Run `pnpm check`, `pnpm test:db`, and `pnpm test:e2e` before claiming a
  milestone gate is complete.

## Source of truth

- `docs/milestones.md` defines the locked implementation roadmap and current
  milestone gate.
- `ops/release-contract.json` defines machine-checked release requirements.
- `ops/RELEASE_CHECKLIST.md` defines operator-only staging/production steps.
- `package.json`, `pnpm-lock.yaml`, `apps/mobile/package.json`, `app.json`, and
  `eas.json` define the current toolchain and release metadata.
- SQL migrations define database behavior; never rewrite already-applied
  production migration history.
- Generated Supabase database types must be refreshed after schema changes that
  affect generated client types.
- `docs/decision-log.md` records accepted architecture decisions.
