# Mithaq | ميثاق

Mithaq is an Arabic-first, privacy-forward product for serious marriage introductions among adult Libyans in Libya and the diaspora.

## Current milestone

Stages A through D are merged to `main`.

Stage E adds controlled introductions on top of private discovery while keeping conversation UI closed until the next milestone.

The current Stage E slice includes:

- shared participation gate tightened to the marriage-only launch rules
- reciprocal discovery interest creates at most one seven-day controlled introduction
- discovery interest does **not** count as accepting the introduction
- both members start each introduction with a fresh `pending` decision
- explicit accept / decline required from each member
- only two accepts produce `mutually_accepted`
- introduction inbox with active and historical states
- privacy-aware introduction detail and compatibility reasons
- private approved-photo access with five-minute signed URLs
- saved photo privacy rules continue to control visibility inside introductions
- explicit photo reveal consent supported after mutual acceptance where required
- recognized-person hide and member block actions
- existing offer and mutual-acceptance notification triggers reused
- no phone numbers, external contact details or conversation UI exposed

The existing `mithaq-staging` Supabase project remains the backend source of truth. The conversation backend already exists but is intentionally not surfaced by Stage E.

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

Earlier staging migrations were created before the application repository was scaffolded and are not yet mirrored here. Before production, export/baseline the complete schema and keep all future migrations in Git.

## Current product boundary

Only invited users with completed onboarding, practical priorities, an approved member profile and a clear safety state can participate. Reciprocal discovery interest may create a time-limited introduction, but each side must separately accept it. Even after mutual acceptance, Stage E does not expose chat or contact information. Identity/selfie verification still requires choosing and integrating a real provider; no verification badge is granted without actual backend evidence.
