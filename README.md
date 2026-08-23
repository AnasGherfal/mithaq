# Mithaq | ميثاق

Mithaq is an Arabic-first, privacy-forward product for serious marriage introductions among adult Libyans in Libya and the diaspora.

## Current milestone

Stages A and B are complete and merged to `main`.

Stage C is building the private photo and verification layer required before discovery. The current Stage C slice includes:

- invited + completed-onboarding gate for new photo uploads/replacements
- private Supabase Storage bucket with JPG/PNG/WebP and 8 MB limits
- member photo manager with max-five enforcement
- randomized private storage paths that do not expose original filenames
- review states: pending, approved, needs changes, rejected
- primary-photo selection and ordering
- member photo deletion with durable orphan cleanup fallback
- member trust panel for phone/photo/real-person/+18/identity verification states
- moderator-only photo queue with five-minute signed image access
- audited approve / needs-changes / reject decisions
- no external identity-verification provider is claimed or simulated yet

The existing `mithaq-staging` Supabase project remains the backend source of truth. Discovery, controlled introductions and chat are still intentionally closed.

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

Earlier staging migrations were created before the application repository was scaffolded and are not yet mirrored here. Before production, export/baseline the complete schema and keep all future migrations in Git.

## Current product boundary

Only invited users with completed member onboarding can upload/register new photos. Photos remain private and cannot participate in discovery until approved and until the next discovery milestone is deliberately exposed. Identity/selfie verification still requires choosing and integrating a real verification provider; no badge is granted without backend evidence.
