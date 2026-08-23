# Mithaq | ميثاق

Mithaq is an Arabic-first, privacy-forward product for serious marriage introductions among adult Libyans in Libya and the diaspora.

## Current milestone

Stage A is complete and merged to `main`.

Stage B is now building the invited-member experience. The current Stage B slice includes:

- database-enforced invitation gate for marriage-member features
- automatic marriage-space activation only after invitation
- three-step invited-member onboarding
  - display profile and about-me
  - practical marriage priorities
  - disclosure and visibility privacy choices
- private-by-default marriage visibility
- member landing page with a privacy-aware profile preview
- invitation CTA from the waitlist status screen
- discovery, messaging and photos still closed

The existing `mithaq-staging` Supabase project remains the backend source of truth. It already contains later marriage-introduction, photo, moderation, messaging, notification and safety infrastructure that will be exposed in controlled stages.

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

Earlier staging migrations were created before the application repository was scaffolded and are not yet mirrored here. Before production, export/baseline the complete schema and keep all future migrations in Git.

## Current product boundary

Only users whose waitlist application is explicitly marked `invited` can enter Stage B member onboarding. Discovery, direct messaging, member photos and friendship remain closed until their dedicated milestones are built and reviewed.
