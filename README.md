# Mithaq | ميثاق

Mithaq is an Arabic-first, privacy-forward product for serious marriage introductions among adult Libyans in Libya and the diaspora.

## Current milestone

Stages A through E are merged to `main`.

Stage F opens a controlled, text-only conversation after explicit mutual acceptance while keeping contact details private and retaining the existing safety gates.

The current Stage F slice includes:

- shared participation gate remains tied to the marriage-only launch rules
- reciprocal discovery interest creates at most one seven-day controlled introduction
- discovery interest does **not** count as accepting the introduction
- explicit accept / decline required from each member
- only two accepts produce `mutually_accepted`
- mutually accepted introductions can open a private in-app conversation
- conversation inbox with unread counts
- text-only messages limited to 2,000 characters
- idempotent sends and a per-member conversation rate limit enforced in Postgres
- read-state tracking and cursor-ready message history
- message-received notifications
- report, block and end-conversation controls
- private approved-photo access with five-minute signed URLs
- explicit photo reveal consent after mutual acceptance where required
- no automatic phone-number or external-contact sharing

The existing `mithaq-staging` Supabase project remains the backend source of truth. The conversation backend predates the application repository and is now surfaced through the Stage F web flow.

## Local setup

Requires Node.js 22+.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Fill `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with the staging project's publishable key before running auth flows.

Open `http://localhost:3000`.

## Validation

```bash
npm ci
npm run typecheck
npm run build
```

GitHub Actions runs the same dependency install, typecheck and production build on pull requests and on pushes to `main`.

## Supabase

Staging project ref: `pelvtwjibbehtlpfhadg`.

Repository-tracked migrations added after the initial backend build include:

- `20260823124449_add_atomic_waitlist_save_rpc.sql`
- `20260823124508_restrict_save_my_waitlist_execute.sql`
- `20260823125834_stage_a_admin_waitlist_analytics.sql`
- `20260823130650_stage_a_waitlist_admin_operations.sql`
- `20260823131527_stage_b_invited_member_boundary.sql`
- `20260823131553_stage_b_pause_noninvited_marriage_spaces.sql`
- `20260823132419_stage_c_invited_photo_boundary.sql`
- `20260823132805_stage_c_moderator_photo_access.sql`
- `20260823133448_stage_d_invited_discovery_eligibility.sql`
- `20260823133642_stage_d_private_discovery_photo_access.sql`
- `20260823134631_stage_e_invited_participation_and_mutual_interest.sql`
- `20260823134706_stage_e_private_introduction_photo_access.sql`
- `20260823135616_stage_f_message_notification_trigger.sql`
- `20260823171236_stage_f_remove_duplicate_message_notification_trigger.sql`

Earlier staging migrations were created before the application repository was scaffolded and are not yet mirrored here. Before production, export/baseline the complete schema and keep all future migrations in Git.

## Current product boundary

Only invited users with completed onboarding, practical priorities, an approved member profile and a clear safety state can participate. Reciprocal discovery interest may create a time-limited introduction, and each side must separately accept it before conversation can open. Stage F exposes text chat only while continuing to withhold phone numbers and other external contact details. Identity/selfie verification still requires choosing and integrating a real provider; no verification badge is granted without actual backend evidence.
