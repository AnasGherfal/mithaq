# Mithaq | ميثاق

Mithaq is an Arabic-first, privacy-forward product for serious marriage introductions among adult Libyans in Libya and the diaspora.

## Current milestone

Stages A and B are merged to `main`.

Stage C (private photos and trust) is complete in code and green in PR #9. Stage D is now layered on top of that branch and adds private marriage discovery while keeping introductions and chat closed.

The current Stage D slice includes:

- invited-only discovery eligibility
- completed onboarding + practical marriage priorities required
- approved profile review + clear safety state required
- moderator profile-review console with audited decisions
- at most six curated discovery candidates per request
- reciprocal hard-match constraints from both members' waitlist preferences
- privacy-aware standard vs private candidate presentation
- compatibility reasons (same city and practical marriage priorities)
- visible trust badges only when backend evidence exists
- approved primary photos served from the private bucket through short-lived signed URLs
- interest (`noticed`) and 14-day skip actions
- explicit pair hiding for known/unwanted matches
- Family Shield using hashed phone exclusions and masked last-four display
- no contact information or open messaging in discovery

The existing `mithaq-staging` Supabase project remains the backend source of truth. Controlled introductions and chat are intentionally separate later milestones.

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

Earlier staging migrations were created before the application repository was scaffolded and are not yet mirrored here. Before production, export/baseline the complete schema and keep all future migrations in Git.

## Current product boundary

Only invited users with completed onboarding, completed practical priorities, an approved member profile and a clear safety state can enter marriage discovery. Discovery records interest, skip and hide decisions but does not create a conversation or expose contact information. Identity/selfie verification still requires choosing and integrating a real provider; no verification badge is granted without actual backend evidence.
