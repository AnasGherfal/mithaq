# Milestones and gates

## Milestone 0 — Product and architecture foundation

- [x] Stage A boundary defined.
- [x] Architecture, schema direction, routes, security model, and visual
      direction recorded.

## Milestone 1 — Project foundation

- [x] Next.js App Router and strict TypeScript.
- [x] Tailwind and shadcn-compatible UI foundation.
- [x] Arabic/English always-prefixed routing.
- [x] Server-rendered RTL/LTR direction.
- [x] Environment validation.
- [x] Supabase browser/server client boundaries.
- [x] Local Supabase configuration and pgTAP smoke test.
- [x] PWA manifest, generated icons, offline fallback, connectivity state, and
      controlled updates.
- [x] Unit and production E2E test suites.
- [x] Read-only CI definition.
- [x] `pnpm check` passes in CI.
- [x] `pnpm test:db` passes in CI.
- [x] `pnpm test:e2e` passes in CI.
- [ ] Manual Arabic and English mobile direction screenshots reviewed.

## Milestone 2 — Public trust website

- [x] Arabic/English public home experience.
- [x] How-it-works, privacy/safety, women, men, Libya/diaspora, FAQ, policy,
      contact, and responsive navigation content.
- [x] Production browser coverage retained in CI.

## Milestone 3 — Verified waitlist and phone OTP

- [x] 18+ and serious-marriage intent gates before phone collection.
- [x] Phone OTP authentication through Supabase Auth.
- [x] Deterministic local-only test OTPs for integration testing.
- [x] Structured Stage A questionnaire with final validation.
- [x] Returning-user questionnaire hydration and editing.
- [x] Required consent history and optional communications consent.
- [x] Communications-consent withdrawal.
- [x] Private referral code attribution and conversion count.
- [x] Registration status and explicit identity-verification boundary.
- [x] Waitlist-data and entire-account deletion request capture.
- [x] Reviewed schema migrations with unique monotonic versions.
- [x] Auth-user bootstrap into the public user row.
- [x] Least-privilege authenticated table grants underneath RLS.
- [x] Cross-user pgTAP isolation tests for reads and mutations.
- [x] Production build against a live local Supabase stack in CI.
- [x] End-to-end phone OTP → questionnaire → consent → success → status →
      edit/resume journey against local Supabase in CI.

**Gate:** Milestone 3 automated acceptance is complete. Phone verification is
not identity verification, and no private-introduction features may begin until
the later Stage A decision gates are satisfied.

## Milestone 4 — Admin analytics

Planned: invitation-only administrators, MFA, aggregate funnel/cohort functions,
small-cell suppression, audited exports, and no casual raw-answer browsing.

## Milestone 5 — Production hardening

Planned: production SMS provider and delivery testing, rate limits, bot
controls, tested CSP, monitoring, backup/restore, performance, accessibility
review, PWA install inspection, staging, deployment, and launch checklist. Pin
all third-party GitHub Actions to reviewed full commit SHAs.

## Milestone 6 — Controlled Stage A launch

A limited real-user launch measures qualified phone-verified demand, female
participation, questionnaire completion, verification willingness, marriage
timeline, referral rate, viable two-sided cohorts, and safety/privacy incidents.

## Milestone 7 and onward — Private beta gate

Profiles, identity/liveness verification, introductions, photographs, messaging,
family participation, and moderation begin only after an explicit Stage A go
decision.
