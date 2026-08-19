# Mithaq implementation roadmap

This is the locked implementation roadmap for the current product. Milestones
move in order. Existing privacy, RLS, matching, moderation, and disclosure
contracts remain binding as later milestones are added.

## Current position

- M1–M8: core mobile, account/privacy, profiles, safety, introductions,
  conversations, and activity foundations are implemented.
- M9: source-controlled production hardening is substantially implemented, but
  hosted acceptance and preview/release stabilization remain open.
- M10: premium native product redesign is active on the SDK 54 Expo Go preview
  branch so physical-iPhone feedback can be incorporated continuously.
- SDK 57 remains the production release target after the approved UI is ported
  from the temporary SDK 54 preview branch.

## M1 — Mobile foundation ✅

- Expo Router native member application.
- Arabic-first member journey with English parity.
- Supabase phone OTP and persisted SecureStore sessions.
- Questionnaire, consent/finalization, success, and account-status flows.
- Returning-user hydration/editing and EAS environment separation.

## M2 — Account, security, and privacy ✅

- Opt-in biometric re-entry protection and session-resume lock.
- Local sign-out hygiene and revocation of other Auth sessions.
- Privacy Center, append-only consent history, communications withdrawal, and
  guarded account deletion.
- Server-controlled lifecycle and client-write boundaries.

## M3 — Resilience foundation ✅

- Narrow-device and keyboard-safe layouts.
- Recoverable loading/network/backend states.
- Bilingual error and unknown-route recovery.
- App-switcher privacy cover, validation, duplicate-submit protection, and
  accessibility states.

## M4 — Private profile foundation ✅

- RLS-protected self-only profiles and guarded save/completeness state.
- Self-preview and server-whitelisted introduction disclosure.
- Optional occupation, education, and origin disclosure defaulting to private.
- No public directory, member search, or swipe catalogue.

## M5 — Trust and safety foundation ✅

- Private blocking and introduction-scoped safety reports.
- Abuse limits, moderation audit trail, safety participation state, and profile
  review gate.
- Safety-aware deletion retention and blocked-pair enforcement.

## M6 — Controlled introductions and matching foundation ✅

- Service-only introduction creation and hard-constraint matching.
- Pair cooldowns and audited expiry.
- Member-only listing and whitelisted counterpart preview.
- Private accept/decline state machine and mutual-acceptance handoff.

## M7 — Private conversations foundation ✅

- Conversation creation only after mutual acceptance.
- Private raw messages, guarded send/list RPCs, pagination, rate limits, and
  idempotent retries.
- Conversation closure, safety access gates, read cursors, and unread counts.

## M8 — Activity foundation ✅

- Private server-side activity inbox and privacy-minimal event payloads.
- Guarded list/unread/read RPCs with cursor-safe pagination.
- Native Activity Center and account-deletion behavior separated from safety
  retention.

## M9 — Hosted preview and release stabilization 🚧

### Independent/source-controlled work

- Keep root and mobile TypeScript, formatting, tests, Expo Doctor, release
  checks, migrations, and production build green.
- Replace the temporary SDK 54 preview branch's stale SDK 57 lockfile with a
  reproducible SDK 54 dependency lock.
- Keep SDK 54 preview-only changes portable to the SDK 57 production branch.
- Preserve immutable CI action pins, private-schema deny-by-default checks,
  `SECURITY DEFINER` search-path checks, message idempotency, retention guards,
  release identity, CSP/security headers, store metadata checks, and worker
  contracts.

### Hosted acceptance

- Connect and verify hosted `mithaq-staging`.
- Apply the full migration history and verify RLS/RPC behavior on staging.
- Schedule and verify first successful deletion, introduction-expiry,
  conversation-retention, and notification-retention worker runs.
- Review production retention-policy values.
- Test real Libya/diaspora OTP delivery once a provider is selected.
- Produce a signed EAS preview and complete physical iPhone/Android acceptance.

### Exit

The preview and release environments are repeatable, security checks are green,
and the exact reviewed build is accepted on physical devices.

## M10 — Premium native member experience 🚧 active

- Complete the native design system: final palette, typography, spacing,
  controls, motion, haptics, loading states, and Mithaq brand lockup.
- Keep the member bottom navigation pinned: Home, Introductions, Activity, and
  Account.
- Enforce one clear purpose and one dominant next action per screen.
- Rebuild onboarding, OTP, questionnaire, consent, Home, Account, Activity,
  profile, safety, and conversation presentation.
- Maintain true Arabic RTL composition and English LTR parity without double
  mirroring or Latin letter spacing on Arabic text.
- Keep conversation and other focused deep tasks free from unrelated tab
  navigation.

### Exit

The complete member journey feels coherent and native on a physical iPhone in
both Arabic and English, with no web-dashboard presentation or unclear next
step.

## M11 — Private photos and guided profile

- Create a private Supabase Storage photo bucket and member-owned photo records.
- Support a required primary portrait and up to four secondary photos.
- Add image selection, permission handling, cropping/compression, upload
  progress, reordering, primary selection, replacement, and deletion.
- Add review/moderation states; reveal only approved photos.
- Issue controlled temporary access only through an eligible introduction; no
  public member image URLs or public gallery.
- Rebuild profile setup as a guided sequence: photo, basics, about, preferences,
  disclosure/privacy, and review.
- Show the member an accurate preview of what an introduced counterpart can see.

### Exit

Two staging members can create complete realistic profiles with approved,
private photos that appear only in permitted introductions.

## M12 — Matching product completion

- Preserve hard eligibility, mutual hard preferences, safety, blocks, and
  cooldowns as non-negotiable filters.
- Add compatibility ranking for supported softer preferences.
- Add activity/availability and fair-exposure controls without selling access
  around another member's preferences.
- Build evidence-based “Why Mithaq introduced you” explanations from actual
  matching inputs; do not display invented percentages.
- Complete current, waiting, mutual, declined, expired, and previous
  introduction states.
- Add safe staging fixtures/operator tooling to exercise a complete match
  between multiple test accounts.

### Exit

A pair can be selected, privately introduced, independently decide, and reach a
mutual handoff with explainable matching reasons.

## M13 — Messaging and notifications

- Polish conversation into a native private messenger with keyboard-safe
  composer, bubbles, timestamps, pagination, retries, unread/read behavior,
  closure, and safety actions.
- Register Expo device tokens with least-privilege server boundaries.
- Add privacy-safe push notifications for a new introduction, mutual acceptance,
  and a new message.
- Add deep links and notification preference controls.
- Never place message text, phone numbers, or sensitive counterpart identifiers
  in notification payloads.

### Exit

Two devices can receive an introduction, mutually accept, receive privacy-safe
notifications, and converse reliably.

## M14 — Verification and operating tools

- Keep phone verification, profile review, photo review, and identity
  verification as distinct states.
- Implement the minimum internal operations surface for profile/photo review,
  safety reports, blocks, suspension/reactivation, deletion status,
  introduction state, and moderation audit.
- Decide and integrate an identity/liveness provider only after legal, privacy,
  cost, and Libya/diaspora coverage review.
- Never claim identity verification before the verification process genuinely
  succeeds.

### Exit

Mithaq can safely operate a private beta without manual database editing.

## M15 — Mithaq+ entitlements and payments

This milestone does not block the first private/public beta unless the business
requires monetization at launch.

- Keep the complete core journey functional for free: profile, eligibility,
  curated introductions, private decisions, mutual conversation, and safety.
- Define premium value around advanced preferences, deeper compatibility
  explanations, greater active-introduction capacity, priority consideration,
  and optional high-touch services—not unlimited swipes.
- Build server-owned entitlements before UI paywalls.
- Add Apple/Google subscriptions, receipt validation, restore purchase,
  cancellation, expiry, and clear subscription disclosures.
- Payment must never bypass compatibility, safety, blocking, consent, or another
  member's preferences.

### Exit

Free and paid accounts behave correctly and securely across renewal, expiry,
and restore scenarios.

## M16 — Production launch and stores

- Provision and verify production Supabase, worker schedules, backups,
  observability, support, rate limits, and final retention values.
- Select and test the final production authentication delivery strategy,
  including Libya carrier and diaspora coverage.
- Port the approved SDK 54 preview UX to the current SDK 57 production target.
- Complete signed EAS builds, TestFlight/internal testing, closed beta fixes, and
  final physical-device acceptance.
- Complete App Store and Play Store records, screenshots in Arabic and English,
  icon/splash assets, privacy declarations, data-safety forms, support and
  deletion URLs, age rating, and subscription disclosures where applicable.

### Exit

Mithaq is published and monitored in production.

## Delivery order from the current branch

1. Finish M9 dependency/release stability while continuing independent M10 UI
   slices.
2. Finish M10 across the whole member journey.
3. Build M11 private photos and guided profile.
4. Complete M12 matching product behavior.
5. Complete M13 messaging and push.
6. Complete the minimum M14 operating tools and private beta.
7. Complete M16 production/store release.
8. Add M15 monetization before or after launch according to the business plan.

## Scope guardrails

- No public profile directory or unrelated engagement mechanics.
- No service-role or private credentials in client code.
- No public member photos.
- No fabricated compatibility claims, verification claims, user counts, or
  testimonials.
- Arabic/English parity, RLS boundaries, private decisions, and safety gates are
  release requirements rather than optional polish.
