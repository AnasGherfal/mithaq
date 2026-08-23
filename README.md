# Mithaq | ميثاق

Mithaq is an Arabic-first, privacy-forward product for serious marriage introductions among adult Libyans in Libya and the diaspora.

## Current milestone

Stage A is complete in code and includes:

- Arabic RTL landing/trust site
- 18+ gate
- phone OTP sign-in with Supabase Auth
- referral open / started / verified / submitted milestones
- authenticated multi-step waitlist questionnaire
- atomic questionnaire persistence through `save_my_waitlist`
- versioned mandatory consent finalization through the existing `finalize_waitlist` RPC
- waitlist status + referral sharing screen
- account settings and 30-day account deletion request flow
- public safety/trust, pre-launch terms and privacy pages
- admin aggregate waitlist analytics
- admin waitlist review/status operations with private audit logging
- PWA manifest and icon

The existing `mithaq-staging` Supabase project is currently the backend source of truth. It already contains additional profile, marriage-introduction, moderation, messaging and safety infrastructure; those later-stage capabilities are intentionally not exposed by the Stage A UI.

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

GitHub Actions runs the same dependency install, typecheck and production build on pull requests and on pushes to `main` or the active feature branch.

## Supabase

Staging project ref: `pelvtwjibbehtlpfhadg`.

New database work from Stage A is tracked under `supabase/migrations/`:

- `20260823124449_add_atomic_waitlist_save_rpc.sql`
- `20260823124508_restrict_save_my_waitlist_execute.sql`
- `20260823125834_stage_a_admin_waitlist_analytics.sql`
- `20260823130650_stage_a_waitlist_admin_operations.sql`

Earlier staging migrations were created before the application repository was scaffolded and are not yet mirrored here. Before production, export/baseline the complete schema and keep all future migrations in Git.

## Product boundary for Stage A

Stage A collects serious intent and preferences, but does **not** open member discovery, direct messaging, public photos or friendship features. Stage B begins invited-member onboarding while keeping discovery and chat closed.
