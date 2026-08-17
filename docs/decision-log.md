# Decision log

This document records product and architecture decisions that should not be silently reversed.

## D-001 — Arabic is the deterministic default locale

Mithaq uses `/ar/...` and `/en/...` routes. `/` redirects to `/ar`. Browser-language detection does not override Arabic as the product default.

## D-002 — Stage A validates trust and network viability

Stage A is a phone-verified serious-marriage waitlist and validation product. It does not perform matchmaking, profile discovery, introductions, messaging, or payments.

## D-003 — No service-role secret in normal application code

Browser and ordinary server request flows use the Supabase publishable key plus the authenticated user's session. RLS remains the database authorization boundary. Privileged keys are not exposed to the browser or used as a shortcut around RLS.

## D-004 — No ORM initially

SQL migrations and generated Supabase database types remain the schema source of truth.

## D-005 — Conservative PWA caching

The PWA uses an allowlist approach. It must not cache API responses, Supabase traffic, authenticated waitlist data, admin data, OTP flows, or deletion flows.

## D-006 — Supabase SSR session refresh lives in `proxy.ts`

Next.js 16 uses `proxy.ts`. Milestone 3 composes Supabase cookie/session refresh with locale routing while preserving cookies from both systems.

## D-007 — Phone verification is not identity verification

Successful SMS OTP proves control of a phone number only. Mithaq must never display an identity-verified badge or equivalent claim until a later identity-verification flow has actually succeeded.

## D-008 — Consent history is append-only

Required and optional consent events are versioned and immutable. Withdrawal creates a new event referencing the prior grant; it does not overwrite historical consent evidence.

## D-009 — Referral attribution is privacy-safe

Referral attribution uses an opaque random session identifier and internal milestone events. Referrers may see only their own code and aggregate completed-registration counts. They must never receive referred-user identities, phone numbers, questionnaire answers, or application records.

## D-010 — Submitted questionnaire edits preserve submission state

A returning waitlist user may edit permitted questionnaire fields. Saving an edit must not silently revert a submitted application to draft and must not recreate required policy-consent events.

## D-011 — Exact birth dates are out of Stage A

Stage A collects age bands rather than exact dates of birth to reduce unnecessary sensitive-data collection.

## D-012 — Full phone numbers are not duplicated into application tables

Supabase Auth remains the source of truth for the full phone number. Application tables may store only limited operational metadata such as country ISO when justified.

## D-013 — CSP is deferred until production hardening

A tested Content-Security-Policy belongs to Milestone 5. The foundation does not ship a broad untested CSP merely to satisfy a checklist.
