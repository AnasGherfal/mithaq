# Security and privacy foundation

## Controls implemented in Milestone 1

- Required environment variables are validated with Zod through
  `@t3-oss/env-nextjs`.
- No service-role or other privileged Supabase key exists in client or server
  configuration.
- Supabase browser and server clients are separated.
- The health endpoint returns a fixed, non-sensitive response and
  `Cache-Control: no-store`.
- Foundation-wide headers disable framing and unneeded camera, microphone,
  geolocation, and payment capabilities.
- The service worker has no runtime data cache and does not cache APIs or
  Supabase responses.
- The public foundation collects no registration, profile, photograph,
  identity-document, or analytics data.
- CI uses read-only repository permissions.
- Local environment files and Playwright artifacts are ignored by Git.

## Deliberately not claimed

- Phone verification is not identity verification.
- No Stage A user data or RLS policy exists yet because no application table
  exists.
- A tested Content Security Policy is not present yet.
- PWA manifest presence alone is not treated as proof of installability.
- Screenshot prevention and absolute privacy cannot be promised.

## Required controls before Stage A data collection

Milestone 3 must add:

1. versioned, append-only consent records;
2. authenticated server-side mutations with Zod validation;
3. ownership RLS policies and automated cross-user isolation tests;
4. OTP abuse controls, bot protection, rate limits, and provider-safe errors;
5. data minimization and retention decisions;
6. user withdrawal and deletion workflows;
7. privacy-safe audit events without raw sensitive values.

## Required controls before production launch

Milestone 5 must add and verify:

- a tested Content Security Policy;
- privacy-filtered error monitoring;
- dependency and secret scanning;
- production rate limiting;
- backup and restoration procedures;
- incident ownership and escalation;
- legal/privacy review for launch jurisdictions;
- browser/PWA installation testing;
- action pinning to reviewed commit SHAs.
