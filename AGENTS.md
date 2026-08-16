# Agent instructions

## Product boundary

Mithaq is a serious, privacy-conscious marriage-introduction product, not a
casual dating or entertainment application. Preserve the calm, culturally
respectful visual language. Do not introduce hearts, flames, swiping, popularity
mechanics, manipulative engagement patterns, public directories, or unsupported
claims of identity verification.

## Current scope

The repository is at **Milestone 1 — Project Foundation**. Do not add OTP,
waitlist, profiles, matching, introductions, photos, messaging, family accounts,
admin tools, payments, analytics trackers, or AI features unless a later
milestone is explicitly authorized.

## Engineering rules

- Keep TypeScript strict; do not add `any`, broad casts, `@ts-ignore`, or
  disabled lint rules merely to pass checks.
- Prefer Server Components. Add Client Components only around actual browser
  interaction.
- Keep Arabic and English message keys synchronized.
- Preserve always-prefixed locale routing and Arabic as the deterministic
  default.
- Use logical start/end styling rather than physical left/right styling when
  direction matters.
- Never expose Supabase secret/service-role keys to the browser.
- Do not log phone numbers, tokens, OTPs, cookies, profile answers, or other
  private data.
- Treat RLS and server authorization as independent required controls in later
  milestones.
- Do not add runtime PWA caching for APIs, Supabase, authenticated routes, or
  user data.
- Add or update tests with every behavior change.
- Run `pnpm check`, `pnpm test:db`, and `pnpm test:e2e` before claiming
  completion.

## Source of truth

- `package.json` and `pnpm-lock.yaml` define the toolchain.
- SQL migrations will define the database once Stage A tables begin.
- Generated Supabase database types must be refreshed after schema migrations.
- `docs/decision-log.md` records accepted architecture decisions.
- `docs/milestones.md` defines the current implementation gate.
