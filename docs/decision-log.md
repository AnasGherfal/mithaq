# Decision log

| ID    | Status   | Decision                                                                                      | Rationale                                                                           |
| ----- | -------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| D-001 | Accepted | Stage A validates trust and network viability; Milestone 1 implements no business journey.    | Prevents an unsafe dating-style prototype from outrunning trust validation.         |
| D-002 | Accepted | Arabic is the deterministic default at `/ar`; English is always prefixed at `/en`.            | Makes the Arabic-first promise explicit and testable.                               |
| D-003 | Accepted | `lang` and `dir` are rendered on the server.                                                  | Avoids incorrect initial direction and hydration repair.                            |
| D-004 | Accepted | Next.js App Router and Server Components are the default architecture.                        | Minimizes browser JavaScript and centralizes trusted operations.                    |
| D-005 | Accepted | Supabase uses separate browser/server SSR clients with no service-role key.                   | Preserves least privilege and prepares for cookie-based authentication.             |
| D-006 | Accepted | No ORM is introduced in the foundation.                                                       | SQL migrations and generated Supabase types will remain the schema source of truth. |
| D-007 | Accepted | The PWA uses an allowlist-style precache and no runtime API/data caching.                     | Prevents private data from entering long-lived browser caches.                      |
| D-008 | Accepted | Supabase Auth session refresh is deferred to Milestone 3.                                     | Avoids fake authentication behavior before the OTP flow exists.                     |
| D-009 | Accepted | A full Content Security Policy is deferred to Milestone 5.                                    | CSP must be based on real integrations and tested rather than guessed.              |
| D-010 | Accepted | Stage A will collect age bands rather than exact birth dates.                                 | Reduces unnecessary sensitive data while supporting validation cohorts.             |
| D-011 | Accepted | The provisional PWA mark is generated in-repository from an original threshold/arch motif.    | Keeps the build reproducible without implying final brand approval.                 |
| D-012 | Accepted | First-party validation events are preferred over third-party behavioral advertising trackers. | Sensitive questionnaire behavior should not be disclosed to ad-tech systems.        |
