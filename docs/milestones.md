# Mithaq delivery milestones

This roadmap tracks the remaining work from the current repository state to a
production launch. Earlier milestones M1–M8 established the application,
privacy/security foundation, member profile, trust and safety, controlled
introductions, conversations, and activity contracts.

## M9 — Hosted preview and release stability

- Keep the SDK 54 Expo Go branch usable for rapid physical-device UX testing
  while SDK 57 remains the production target.
- Maintain deterministic dependency contracts and green mobile type/format/ Expo
  checks.
- Provision hosted staging, apply migrations, configure maintenance workers,
  verify test OTP accounts, and exercise RLS/security against hosted services.
- Configure real phone delivery and produce signed preview builds when external
  credentials are available.

### Exit

The preview and hosted staging environments are repeatable, secure, and usable
for acceptance testing.

## M10 — Premium native member experience

- Rebuild member-facing surfaces around one purpose and one obvious primary
  action per screen.
- Keep bottom navigation persistent only for primary destinations; focused flows
  such as conversation and setup use dedicated navigation.
- Complete Arabic RTL and English LTR parity across authentication,
  questionnaire, consent, profile, Home, Introductions, Activity, Account,
  privacy, safety, security, and conversation.
- Lock the Mithaq brand system: logo/wordmark, typography, spacing, motion,
  loading, empty, error, keyboard, sheet, and haptic behavior.
- Avoid dashboard-card overload and unnecessary scrolling.

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
- Issue controlled temporary access only through an eligible introduction or a
  future explicitly authorized discovery surface; no public member image URLs.
- Rebuild profile setup as a guided sequence: photo, basics, about, preferences,
  disclosure/privacy, and review.
- Show the member an accurate preview of what another authorized member can see.

### Exit

Two staging members can create complete realistic profiles with approved,
private photos that appear only through permitted product surfaces.

## M12 — Discovery, Friends, and matching product completion

M12 gives members a reason to open Mithaq before a curated marriage introduction
arrives, while keeping friendship and marriage as two explicit, non-mixed
products under one account. Detailed contracts live in
`docs/m12-discovery-and-matching.md` and `docs/connection-spaces.md`.

### Shared space foundation

- Let a member join Marriage, Friends, or both without silent enrollment.
- Persist the member's current space and reopen it on returning sessions.
- Keep profiles, discovery eligibility, interest signals, activity, visibility,
  and conversations scoped to their originating space.
- Keep authentication, language, device security, account deletion, and severe
  safety enforcement account-wide.
- Never copy marriage biography, photos, or preferences into Friends without an
  explicit member choice.

### Marriage discovery and matching

- Preserve hard eligibility, mutual hard preferences, safety, blocks, and
  cooldowns as non-negotiable filters.
- Add a finite privacy-safe Discover surface rather than an infinite swipe deck
  or public member directory.
- Let members privately express curiosity/interest from Discover; never reveal
  that signal directly and never treat it as a match.
- Feed private discovery interest into compatibility ranking only after hard
  eligibility and mutual preference gates pass.
- Add compatibility ranking for supported softer preferences.
- Add activity/availability and fair-exposure controls without selling access
  around another member's preferences.
- Add evidence-based “Why Mithaq introduced you” explanations from actual
  matching inputs; do not display invented percentages.
- Complete current, waiting, mutual, declined, expired, and previous
  introduction states.
- Add personality/profile prompts and interest signals needed to make profiles
  feel human rather than demographic forms.

### Friends product

- Use a separate friendship profile based on preferred name, city, friendship
  introduction, interests, and future friendship-specific prompts.
- Add finite interest- and activity-based friend discovery with independent
  eligibility, review, visibility, ranking, and exposure controls.
- Add private friend requests that do not appear as romantic likes or marriage
  interest.
- Open a friendship-only conversation only after the Friends connection rules
  succeed.
- Keep Friends activity, unread state, notifications, and conversations out of
  Marriage navigation and vice versa.
- Add explicit photo reuse/disclosure later; approved marriage photos are not
  automatically shown in Friends.
- Add safe staging fixtures/operator tooling to exercise both spaces and verify
  that cross-space leakage is impossible.

### Exit

A staging account can use one or both spaces. Marriage discovery can lead into
the controlled introduction flow only after compatibility and safety gates.
Friends discovery can lead into a mutual friendship connection using separate
profile, signal, activity, and conversation contracts. No friendship-only member
appears in marriage matching, and no marriage signal or message appears inside
Friends.

## M13 — Messaging and notifications

- Polish conversation into native private messengers with keyboard-safe
  composers, bubbles, timestamps, pagination, retries, unread/read behavior,
  closure, and safety actions.
- Keep Marriage and Friends conversations in separate server-owned contexts and
  separate activity streams.
- Register Expo device tokens with least-privilege server boundaries.
- Add privacy-safe push notifications for a new introduction, mutual acceptance,
  friend connection, and a new message.
- Add deep links and notification preference controls that preserve the target
  space.
- Never place message text, phone numbers, or sensitive counterpart identifiers
  in notification payloads.

### Exit

Two devices can receive a marriage introduction or a friendship connection,
enter the correct separate conversation, receive privacy-safe notifications, and
converse reliably.

## M14 — Verification and operating tools

- Keep phone verification, profile review, photo review, and identity
  verification as distinct states.
- Implement the minimum internal operations surface for marriage/friendship
  profile review, photo review, safety reports, blocks, suspension/reactivation,
  deletion status, connection state, and moderation audit.
- Decide and integrate an identity/liveness provider only after legal, privacy,
  cost, and Libya/diaspora coverage review.
- Never claim identity verification before the verification process genuinely
  succeeds.

### Exit

Mithaq can safely operate a private beta without manual database editing.

## M15 — Mithaq+ entitlements and payments

This milestone does not block the first private/public beta unless the business
requires monetization at launch.

- Keep the complete core journey functional for free in both spaces: profile,
  finite discovery, private connection decisions, conversation, and safety.
- Define premium value around advanced preferences, deeper compatibility
  explanations, a modestly larger finite discovery set, greater
  active-introduction capacity, priority consideration, and optional high-touch
  services—not unlimited swipes.
- Keep space-specific entitlements explicit; a Friends benefit must not silently
  change Marriage exposure or vice versa.
- Build server-owned entitlements before UI paywalls.
- Add Apple/Google subscriptions, receipt validation, restore purchase,
  cancellation, expiry, and clear subscription disclosures.
- Payment must never bypass compatibility, safety, blocking, consent, or another
  member's preferences.

### Exit

Free and paid accounts behave correctly and securely across renewal, expiry, and
restore scenarios.

## M16 — Production launch and stores

- Provision and verify production Supabase, worker schedules, backups,
  observability, support, rate limits, and final retention values.
- Select and test the final production authentication delivery strategy,
  including Libya carrier and diaspora coverage.
- Port the approved SDK 54 preview UX to the current SDK 57 production target.
- Complete signed EAS builds, TestFlight/internal testing, closed beta fixes,
  and final physical-device acceptance.
- Complete App Store and Play Store records, screenshots in Arabic and English,
  icon/splash assets, privacy declarations, data-safety forms, support and
  deletion URLs, age rating, and subscription disclosures where applicable.

### Exit

Mithaq is published and monitored in production.

## Delivery order from the current branch

1. Finish M9 dependency/release stability while continuing independent M10 UI
   slices.
2. Finish M10 across the whole member journey.
3. Finish M11 private photos and guided profile.
4. Complete M12 Marriage discovery, separate Friends, and matching behavior.
5. Complete M13 separate messaging and push contexts.
6. Complete the minimum M14 operating tools and private beta.
7. Complete M16 production/store release.
8. Add M15 monetization before or after launch according to the business plan.

## Scope guardrails

- No infinite swipe deck or unrestricted public member directory.
- No public member photos; every photo surface requires an explicit authorized
  disclosure contract.
- No public follower counts, popularity scores, public likes, or open DMs.
- No service-role or private credentials in client code.
- No fabricated compatibility claims, verification claims, user counts, or
  testimonials.
- Marriage discovery interest is private and cannot bypass compatibility,
  safety, blocking, consent, or another member's preferences.
- Marriage and Friends are explicit separate spaces. Profile data, discovery
  signals, activity, and conversations do not cross automatically.
- Arabic/English parity, RLS boundaries, private decisions, and safety gates are
  release requirements rather than optional polish.
