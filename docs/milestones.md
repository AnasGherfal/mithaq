# Mithaq delivery milestones

This roadmap is the release source of truth for the current Mithaq private-beta
path.

## Release decision: marriage only

The first private beta and first public release are **Marriage only**.

The Friends experiments and friendship-specific routes may remain in source
while they are being evaluated, but they are **deferred and must not be
required, promoted, or exposed as part of the launch journey**. They do not
block Marriage beta and must not weaken Marriage privacy or safety boundaries.

The launch member journey is:

1. phone OTP and waitlist application
2. admin review: submitted → qualified → invited
3. invited member setup
4. profile/photo review
5. Marriage discovery eligibility
6. private discovery interest
7. controlled introduction
8. explicit acceptance by both members
9. private in-app conversation
10. activity, unread state, report/block/close controls

Phone verification, profile review, photo review, and future identity
verification remain separate states.

## Canonical release base

The native Expo branch contains the fuller schema, security, worker, testing,
and release-hardening history and is the canonical product/release base.

The newer F→K web stack is a UX/product-reference source. Useful copy, admin
information architecture, and gate explanations should be ported selectively
rather than merging the two divergent histories blindly.

The consolidation release-candidate branch is:

- `consolidation/private-beta-rc1`

## M9 — Hosted preview and release stability

- keep mobile TypeScript, formatting, Expo checks, and CI green
- keep the web trust/legal surface build green
- verify hosted staging matches the repository schema history
- configure maintenance workers and verify their first hosted runs
- configure real SMS delivery and test Libya/diaspora coverage
- produce signed preview builds when EAS credentials are available

### Exit

Hosted staging and preview builds are repeatable and usable for acceptance
testing without manual database editing.

## M10 — Premium native Marriage experience

- one obvious primary action per screen
- Arabic RTL and English LTR parity
- coherent auth, waitlist status, invitation, profile, review, discovery,
  introductions, activity, account, privacy, safety, and conversation flows
- no dashboard-card overload or web-like navigation inside the native member app
- clearly distinguish application review, membership invitation, profile review,
  and discovery readiness

### Exit

The complete Marriage journey feels coherent on physical iPhone and Android
devices in Arabic and English.

## M11 — Private photos and guided profile

- private member-owned photo storage
- primary portrait plus optional additional photos
- upload, replace, reorder, delete, and review states
- temporary authorized photo access only
- no public member photo URLs
- accurate member preview of what an authorized counterpart can see

### Exit

Two staging members can create realistic reviewed profiles with private photos
that appear only through authorized product surfaces.

## M12 — Marriage discovery and matching completion

- preserve hard eligibility, mutual hard preferences, safety, blocks, cooldowns,
  and review state as non-negotiable gates
- finite discovery set; no infinite swipe deck and no public member directory
- private `noticed` / skip signals
- discovery interest never equals introduction acceptance
- reciprocal interest can create at most one controlled introduction under the
  backend rules
- complete current, waiting, mutual, declined, expired, closed, and previous
  introduction states
- explain real alignment inputs without fabricated compatibility percentages
- add safe synthetic population tooling for sparse-market and scale tests

### Exit

Two eligible staging members can move from Discover to a controlled introduction
without any private signal, phone number, raw user ID, or blocked data leaking.

## M13 — Messaging, activity, and push

- conversation opens only after explicit dual introduction acceptance
- keyboard-safe composer, retries, cursor history, unread/read behavior,
  closure, report, and block
- privacy-minimal Activity Center
- push registration and discreet push delivery
- no message text, phone number, or sensitive counterpart identifier in push
  payloads
- deep links open the correct Marriage destination

### Exit

Two physical devices can complete an introduction, open chat, exchange messages,
receive privacy-safe activity/push events, and close/report/block safely.

## M14 — Operating tools and verification

- protected web admin console for waitlist, profile review, photo review, safety
  reports, and audited moderation actions
- deliberate suspend/ban/reactivate controls with stronger confirmation
- operator search/filter/history needed for private beta
- decide identity/liveness provider only after legal, privacy, cost, and
  Libya/diaspora coverage review
- never display identity verification until the real verification process
  succeeds

### Exit

Mithaq can operate a private Marriage beta without manual SQL changes for
routine review or safety work.

## M15 — Monetization (non-blocking)

Mithaq+ and payments do **not** block the first private beta unless the business
explicitly changes that decision.

Core profile, finite discovery, controlled introductions, conversation, privacy,
and safety must remain functional without payment.

## M16 — Production and stores

- production Supabase, backups, monitoring, alerts, final retention values, and
  worker schedules
- final production SMS strategy with Libya carrier and diaspora testing
- signed EAS builds and physical-device acceptance
- TestFlight/internal Android testing and closed beta fixes
- App Store / Play Store records, screenshots, privacy/data-safety declarations,
  age rating, support, and deletion URLs
- incident and moderation operating process

### Exit

Mithaq Marriage is published, monitored, supportable, and safe to operate in
production.

## Acceptance labels

Every release gate uses one of these labels:

- **AUTOMATED PASS** — CI, database, security, or deterministic integration
  checks prove the requirement.
- **NEEDS YOUR TEST** — a real phone/browser/account interaction is required and
  the owner will receive an exact screen-by-screen checklist.
- **NEEDS BETA USERS** — one or two synthetic/test accounts cannot provide a
  meaningful product answer; a real cohort is required.

The user should never be asked to manually test something that can be validated
deterministically in CI or with controlled staging fixtures.

## Private-beta sequence

1. Consolidate the canonical native release candidate and keep automated checks
   green.
2. Verify hosted staging schema/worker parity.
3. Create two sanctioned login-capable staging accounts.
4. **NEEDS YOUR TEST:** run the two-account end-to-end journey.
5. Fix all blockers from that journey.
6. Run synthetic matching/population/load tests for cases that require many
   accounts.
7. Produce a signed preview build.
8. **NEEDS YOUR TEST:** physical iPhone and Android smoke test.
9. Start a small private beta, approximately 10–20 real testers.
10. **NEEDS BETA USERS:** assess matching usefulness, sparse-pool behavior,
    moderation workload, trust comprehension, and conversation behavior.
11. Expand toward 30–50 testers after the first cohort is stable.
12. Complete M16 production/store gates before public launch.

## Scope guardrails

- Marriage only for the first beta/release.
- No infinite swipe deck or unrestricted public member directory.
- No public member photos.
- No public follower counts, popularity scores, public likes, or open DMs.
- No service-role or private credentials in client code.
- No fabricated compatibility claims, verification claims, user counts, or
  testimonials.
- Marriage discovery interest is private and cannot bypass compatibility,
  safety, blocking, consent, or another member's preferences.
- Phone numbers and external contact details are never shared automatically.
- Arabic/English parity, RLS boundaries, private decisions, and safety gates are
  release requirements rather than optional polish.
