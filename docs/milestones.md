# Mithaq implementation roadmap

This document is the locked implementation roadmap for the current branch.
Milestones move in order. Existing security/privacy contracts remain binding as
later milestones are added.

## M1 — Mobile foundation ✅

- Expo SDK 57 + React Native 0.86 + Expo Router.
- Arabic-first RTL member experience with English parity.
- International E.164 Supabase phone OTP.
- SecureStore-backed persisted sessions.
- Native questionnaire, consent/finalization, success, and registration-status
  flows.
- Returning-user hydration/editing.
- Development, preview, and production EAS build profiles.

## M2 — Account, security, and privacy ✅

- Opt-in biometric re-entry protection.
- Session-resume lock and local sign-out hygiene.
- Revoke other Supabase Auth sessions.
- OTP resend/rate-limit recovery.
- Privacy Center with append-only consent history.
- Reversible optional communications consent.
- Guarded account-deletion request and privileged deletion execution.
- Server-controlled lifecycle/write-boundary hardening.

## M3 — Premium resilience ✅

- Narrow-phone and keyboard-safe layouts.
- Recoverable loading/network/backend states.
- Bilingual root error boundary and unknown-route recovery.
- Private app-switcher cover for sensitive screens.
- Questionnaire validation and duplicate-submit protection.
- Accessibility live regions, alerts, and loading labels.

## M4 — Private profile foundation ✅

- RLS-protected self-only member profiles.
- Guarded profile save path and completeness state.
- Self-only introduction preview.
- Server-whitelisted profile disclosure.
- Privacy-off-by-default optional occupation, education, and origin disclosure.
- No public member directory, search, or swipe surface.

## M5 — Trust and safety ✅

- Private member blocking and safety reports.
- Introduction-scoped report/block actions without exposing raw member IDs.
- Report-abuse limits and moderation audit trail.
- Safety participation states and profile-review participation gate.
- Safety-aware account-deletion retention.
- Server-side blocked-pair enforcement.

## M6 — Controlled introductions and matching ✅

- Service-only introduction creation.
- Hard-constraint candidate matching.
- Pair cooldowns after decline, cancel, expiry, or closure.
- Expiry worker with private audit records.
- Member-only introduction listing and whitelisted counterpart preview.
- Private accept/decline state machine without leaking the other member's
  pending decision.
- Mutual-acceptance handoff before communication opens.

## M7 — Private conversations ✅ foundation

- Conversation creation only after mutual acceptance.
- Private raw conversation/message tables.
- Guarded message send/list RPCs with cursor pagination and rate limits.
- Idempotent send/retry behavior with client nonces.
- Conversation closure and safety/participation access gates.
- Arabic/English native conversation experience.
- Self-only read cursor and unread counts.

## M8 — Activity and notification foundation ✅

- Private server-side activity inbox for introductions and incoming messages.
- Privacy-minimal event payloads without message text or counterpart IDs.
- Guarded self-only list/unread/read RPCs.
- Cursor-safe pagination, including equal-timestamp boundaries.
- Arabic/English native Activity Center.
- Account entry points for introductions and activity.
- Account-deletion cascade behavior separated from moderation retention.

## M9 — Production hardening 🚧

Completed independent slices include:

- GitHub Actions pinned to reviewed immutable commit SHAs.
- Private-schema deny-by-default ACL regression coverage.
- `SECURITY DEFINER` search-path regression coverage.
- Production indexes for messaging and unresolved safety hot paths.
- Idempotent messaging and serialized rate-limit enforcement.
- Conversation-message and read-activity retention with safety/unread guards.
- Introduction-expiry and maintenance-run auditing.
- Account-deletion reconciliation and worker auditing.
- Service-role-only maintenance backlog, health, and release-readiness checks.
- Machine-checked release environment/worker contract.
- Root/mobile/Expo release-version and native-build metadata checks.
- Privacy-safe web release identity and server-error observations.
- Tested CSP and baseline web security headers.

### M9 acceptance gate

1. Keep root formatting, lint, TypeScript, unit tests, and production build
   green.
2. Keep mobile TypeScript, Prettier, and Expo Doctor green.
3. Keep Supabase pgTAP and the verified OTP/waitlist integration green.
4. Keep production E2E green, including security-header and health metadata
   checks.
5. Keep idempotent retries at exactly one message and one recipient activity
   event.
6. Keep retention preserving unresolved safety evidence and unread activity
   while purging only eligible old data.
7. Keep Activity pagination free of skips/duplicates at equal timestamps.
8. Keep all locked requirements in `ops/release-contract.json` machine-checked.
9. Complete remaining independent production-readiness work before declaring M9
   source-complete.
10. Then perform hosted staging and physical-device acceptance using operator
    credentials before production rollout.

## External gates after independent M9 work

These are release gates, not reasons to weaken or stall independent source work:

- hosted `mithaq-staging` and production Supabase projects/environment values
- hosted schedules for deletion, expiry, and retention workers
- production SMS-provider credentials and delivery testing
- EAS account/project environment values
- Apple Developer/App Store Connect signing and physical iPhone testing
- Google Play signing/console access
- external push delivery and device-token registration

## Deferred product scope

Do not pull these into M9 unless the roadmap is explicitly changed:

- profile photos and identity/liveness verification
- payments
- full admin analytics/moderation console
- additional family-participation workflows
- unrelated engagement or discovery mechanics
