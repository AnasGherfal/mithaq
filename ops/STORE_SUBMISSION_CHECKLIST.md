# Mithaq store submission checklist

This checklist covers source-controlled App Store / Google Play readiness. It does not replace the hosted staging acceptance in `ops/RELEASE_CHECKLIST.md` and it never stores signing credentials, store API keys, or production secrets.

## Source-controlled gates

Before creating a store binary:

- `pnpm check` must be green on the exact release commit.
- `pnpm release:store:check` must pass.
- Mobile TypeScript, formatting, and Expo Doctor must be green.
- `apps/mobile/app.json` must keep the reviewed iOS bundle identifier, Android package, semantic version, native build baselines, canonical Mithaq artwork, splash configuration, and the Face ID permission explanation.
- `apps/mobile/eas.json` must keep `preview` as the internal staging/acceptance profile and `production` as the production profile with native build auto-increment enabled.
- The public website must expose localized privacy, account-deletion, and contact/support pages.
- The account-deletion page must direct members to the authenticated in-app deletion flow rather than asking them to transmit private account data over an unauthenticated public form.
- No service-role key, database password, SMS-provider secret, Apple credential, Google Play credential, or EAS credential may appear in mobile source, public variables, store screenshots, or committed metadata.

## Hosted URLs required for store records

After production hosting exists, derive the final store-review URLs from the reviewed production origin and verify them over HTTPS before submission:

- Privacy policy: `/en/privacy` and `/ar/privacy`
- Account deletion information: `/en/account-deletion` and `/ar/account-deletion`
- Support/contact: `/en/contact` and `/ar/contact`

Use the canonical production origin only. Do not submit preview, staging, localhost, temporary tunnel, or branch-deployment URLs to either store.

## iOS / App Store Connect operator gates

These require the product owner's Apple credentials and cannot be completed from source control:

- Confirm the final bundle identifier is registered to the correct Apple Developer team before the first signed production build.
- Configure signing certificates/profiles through the approved EAS/Apple workflow without committing credentials.
- Create the App Store Connect app record and confirm the bundle ID and version/build match the reviewed binary.
- Complete App Privacy declarations based on the actual production data flows and SDKs in the submitted binary.
- Provide the production privacy-policy, deletion-information, and support URLs.
- Provide age/category/content declarations that match the actual product behavior.
- Upload reviewed screenshots from the signed production build; do not use mock screens that promise unshipped behavior.
- Submit first to TestFlight and complete real-device acceptance before public review.

## Android / Google Play operator gates

These require the product owner's Google Play credentials and cannot be completed from source control:

- Confirm `com.mithaq.app` is available/registered in the intended Play Console account before the first irreversible production association.
- Configure Play App Signing and EAS credentials without committing private keys.
- Create the app record and ensure package, version name, and version code match the reviewed binary.
- Complete Data safety declarations based on the actual production data flows and SDKs in the submitted binary.
- Provide the production privacy-policy, deletion-information, and support URLs.
- Provide content-rating and target-audience declarations that match the actual product behavior.
- Upload reviewed phone screenshots from the signed production build.
- Use internal/closed testing before staged public rollout.

## Final binary acceptance

For both platforms, accept only binaries built from the exact reviewed commit after hosted staging has passed. On physical devices verify Arabic RTL and English LTR, OTP delivery, onboarding, private profile controls, introductions, mutual acceptance, conversations, activity, block/report flows, account deletion, session restoration, biometric re-entry, sign-out, offline/recoverable states, and app-switcher privacy behavior.

If the signed binary behaves differently from the tested source revision, stop the release and rebuild from a reviewed commit rather than editing store declarations to fit an unreviewed binary.
