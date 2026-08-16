# Known risks

| Risk                           | Current position                                                                               | Next control                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Older mobile browsers          | Next.js 16 and Tailwind 4 target modern browsers; older Android WebViews may fail.             | Test representative Libya-market devices and define a supported-browser policy before launch. |
| SMS deliverability and cost    | No provider is selected and Libya/diaspora delivery has not been measured.                     | Provider spike and country-by-country deliverability tests in Milestone 3.                    |
| Legal and privacy obligations  | Launch jurisdictions, retention periods, SMS terms, and processor agreements are not approved. | Legal/privacy review before accepting real registrations.                                     |
| Moderation ownership           | Incident response, emergency escalation, and safety staffing are not assigned.                 | Name owners and rehearse procedures before Stage A launch.                                    |
| Small-cohort re-identification | Diaspora cohort combinations can expose individuals even without names.                        | Aggregate queries and suppress cells below a configurable minimum, initially 10.              |
| PWA cache regression           | A future feature could accidentally add private routes to runtime caching.                     | Mandatory cache-policy review before every authenticated milestone.                           |
| Browser installability         | Automated tests verify the manifest, icons, and worker, not every browser's install UI.        | Manual Chrome/Android and Safari/iOS inspection in Milestone 5.                               |
| Content Security Policy        | No broad CSP is shipped because actual Stage A integrations are not final.                     | Build and test the policy against staging integrations in Milestone 5.                        |
| Provisional brand mark         | The generated arch icon is original but not a finalized identity.                              | Complete brand/legal review before public launch.                                             |
| Google font build dependency   | `next/font/google` may require network access during a clean build.                            | Confirm CI/Vercel reliability; self-host reviewed subsets if needed.                          |
