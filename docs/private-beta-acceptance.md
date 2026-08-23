# Mithaq private-beta acceptance plan

This document defines exactly when a human test is required and when synthetic/automated testing is the correct substitute.

## Gate A — Automated release-candidate checks

**Label: AUTOMATED PASS**

Run before involving a human tester.

Required checks:

- root/web install, formatting/lint/typecheck/tests/build
- mobile TypeScript, formatting, and Expo checks
- database migration and pgTAP/regression tests
- client-secret and private-schema boundary checks
- release metadata/contract checks
- conversation idempotency: one retry = one message + one recipient activity event
- notification/activity cursor tests, including equal timestamps
- safety/report/block/close database gates
- account deletion and retention guards
- no accidental exposure of phone numbers or raw private identifiers through member RPCs

Human testing does not start while a deterministic blocker is red.

## Gate B — First two-account hosted staging journey

**Label: NEEDS YOUR TEST**

This is the first point where the product owner is required.

Prerequisites:

- hosted staging healthy
- two sanctioned phone-login staging accounts
- one admin/moderator login
- both accounts can receive or otherwise legitimately complete the configured staging OTP flow
- no auth bypass or fabricated persistent auth rows

Use Account A and Account B.

### B1. Registration and invitation

For each account:

1. Sign in with phone OTP.
2. Complete the waitlist questionnaire and consent.
3. Confirm the app shows the application as submitted rather than immediately unlocking member discovery.
4. In admin, move the application through `submitted → qualified → invited`.
5. Confirm only `invited` unlocks member profile setup.

Expected privacy result:

- member-facing screens never show the other account's phone number or login identity.

### B2. Member setup and review

For each account:

1. Complete the private profile.
2. Complete required Marriage priorities/privacy controls.
3. Upload photos if the current build requires/permits them.
4. Confirm Home says the profile is under review rather than ready for Discover.
5. Admin reviews profile/photos.
6. Approve the profile.
7. Confirm Discover unlocks only after the real review/eligibility gates pass.

Also test one `needs changes` cycle on at least one account before approval.

### B3. Discovery and reciprocal interest

1. Account A sees B only if the backend hard constraints allow the pair.
2. A records private interest/notice.
3. B must not receive a direct 'A liked you' disclosure.
4. B discovers A and records reciprocal interest.
5. Confirm a controlled introduction is created at most once.

Expected privacy result:

- neither account sees the other's raw user ID, phone number, login metadata, or hidden discovery signal.

### B4. Controlled introduction

1. Open the introduction on both devices/accounts.
2. A accepts.
3. Confirm chat is still unavailable while B has not accepted.
4. B accepts.
5. Confirm chat opens only after both explicit decisions are accepted.

### B5. Conversation and activity

1. A sends one message.
2. Retry the send once if the UI exposes a safe retry path.
3. B receives exactly one message and one unread/activity event.
4. B opens the conversation; unread clears.
5. B replies; A receives the unread/activity event.
6. Load older history if enough fixture messages are present.
7. Confirm phone numbers/contact details are never injected automatically.

### B6. Safety and closure

1. Test a report without block where supported.
2. Test report + block on the other controlled fixture/pair or after resetting fixtures.
3. Test conversation closure.
4. Confirm post-close sends fail.
5. Confirm blocked users no longer regain the pair through discovery/introduction paths.
6. Admin confirms the report appears in the safety queue and transitions can be audited.

### B7. Device/layout smoke

Repeat the critical journey on:

- one physical iPhone
- one physical Android device
- Arabic RTL
- English LTR

Check keyboard handling, safe areas, text clipping, back navigation, loading/error states, and private app-switcher/screen protections where enabled.

## Gate C — Synthetic population and scale

**Label: AUTOMATED PASS**

Do not recruit hundreds of people to test deterministic scale behavior.

Use controlled staging/performance fixtures to exercise:

- 100+ candidate profiles across age/city/residency/marital/children preferences
- sparse pools where a member legitimately has zero candidates
- incompatible pairs that must never appear
- reciprocal interest and duplicate-introduction prevention
- cooldowns after decline/expiry/closure
- fair-exposure / finite discovery limits
- thousands of message/activity rows for cursor and index behavior
- concurrent message sends and discovery actions
- moderation/report queue volume

Synthetic fixtures must be isolated and removable. They must not use fake persistent login identities to impersonate real OTP users.

## Gate D — Small private beta

**Label: NEEDS BETA USERS**

Recommended first cohort: approximately 10–20 real testers, with enough men/women and preference diversity to create multiple legitimate candidate combinations.

Questions this gate answers that automation cannot:

- Do people understand the difference between interest and an introduction?
- Do members trust the privacy model?
- Are profile prompts useful rather than demographic-only?
- Are discovery results perceived as relevant?
- Do users understand why they may have zero candidates in a small pool?
- Is the wait for review/invitation understandable?
- Do people know when family involvement should happen?
- Is the moderation/reporting flow usable?
- Do users immediately try to share contact details, and does the product guidance remain appropriate?

Do not interpret 'zero matches' as a bug until the candidate pool and hard constraints are inspected.

## Gate E — Expanded beta

**Label: NEEDS BETA USERS**

After the first cohort is stable, expand toward 30–50 testers.

Measure:

- percentage of eligible users with at least one candidate
- time from invitation to complete profile
- profile review turnaround
- discovery-to-interest rate
- reciprocal-interest rate
- introduction acceptance/decline rate
- mutual acceptance rate
- conversation start/reply rate
- report/block/close rates
- moderation queue age
- crashes, failed OTPs, push failures, and device-specific issues

These metrics are operational signals, not public popularity claims.

## Gate F — Production/store release

**Label: NEEDS YOUR TEST + AUTOMATED PASS**

Before public launch:

- production Supabase and secrets configured
- backups and monitoring verified
- retention/maintenance workers scheduled and observed successfully
- real SMS delivery tested on target Libya carriers and representative diaspora regions
- push delivery tested on signed builds
- TestFlight/internal Android builds accepted
- production privacy/support/deletion URLs live
- store privacy/data-safety declarations reviewed
- final physical-device smoke journey passed
- incident/moderation ownership documented

## Rule for future development updates

Every feature or release update should explicitly state one of:

- `AUTOMATED PASS`
- `NEEDS YOUR TEST`
- `NEEDS BETA USERS`

If no human test is needed yet, the user should not be asked to perform one.
