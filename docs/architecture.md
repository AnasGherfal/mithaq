# Architecture — Milestone 1

## Objective

Milestone 1 creates a production-quality foundation that can support the Stage A
trust and waitlist product without prematurely implementing it.

## Runtime boundary

```text
Browser or installed PWA
        |
        v
Vercel / Next.js App Router
  - Server Components by default
  - locale-aware root layouts
  - Route Handlers for machine endpoints
  - future Server Actions for authenticated mutations
        |
        +---- Supabase Auth through @supabase/ssr
        |
        +---- Supabase Postgres with RLS in later milestones
        |
        +---- SMS provider abstraction in Milestone 3
```

## Route model

- `/` redirects to `/ar` through `src/proxy.ts`.
- `/ar` renders server-side `lang="ar"` and `dir="rtl"`.
- `/en` renders server-side `lang="en"` and `dir="ltr"`.
- Locale detection is disabled so browser preferences do not silently replace
  the Arabic default.
- `/~offline`, `/api`, `/serwist`, framework assets, and files with extensions
  bypass locale routing.
- Supabase session refresh will be composed into the same `proxy.ts` in
  Milestone 3; no placeholder authentication behavior exists now.

## Application layers

```text
src/app             routes, layouts, metadata, health and service worker
src/components      reusable UI, layout and PWA interaction
src/i18n            routing, request configuration and locale utilities
src/lib             environment, fonts, Supabase clients and helpers
src/messages        synchronized Arabic and English messages
src/types           generated database types once migrations exist
supabase            local configuration, migrations, seed and database tests
tests/e2e           production-browser acceptance tests
```

Future domain modules belong under `src/features`, with validation and
authorization kept centralized rather than embedded in page components.

## Rendering and data access

- Use Server Components by default.
- Client Components are limited to browser-only behavior such as connectivity,
  service-worker updates, and locale interaction.
- Browser Supabase access uses only the public publishable key.
- The server client uses cookie-aware `@supabase/ssr` plumbing without a
  service-role key or authorization shortcut.
- Stage A mutations will validate input with Zod, validate a current principal
  server-side, and rely on RLS as a second enforcement boundary.

## PWA design

Serwist is exposed through `/serwist/sw.js`. The worker:

- precaches generated application assets and `/~offline`;
- has no runtime cache rules;
- provides a document fallback when navigation fails;
- does not force an update while a user is interacting;
- shows a translated update prompt and reloads only after the user accepts and
  the new worker controls the page;
- clears obsolete precaches through Serwist lifecycle handling.

A manual browser installability review remains a Milestone 5 acceptance item.

## Deployment environments

Use separate Supabase projects and Vercel environments for preview/staging and
production. Local development uses the Supabase CLI. No production credentials
belong in the repository or client bundle.
