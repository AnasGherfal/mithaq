# Mithaq store submission checklist

This checklist covers source-controlled App Store / Google Play readiness. It
does not replace the hosted staging acceptance in `ops/RELEASE_CHECKLIST.md` and
it never stores signing credentials, store API keys, or production secrets.

## Source-controlled gates

Before creating a store binary:

- `pnpm check` must be green on the exact release commit.
- `pnpm release:store:check` must pass.
- After the repository is linked to the real Expo/EAS project,
  `pnpm release:native:check` must pass. This strict gate refuses a native build
  if the EAS `projectId` is missing.
- Mobile TypeScript, formatting, and Expo Doctor must be green.
- The native beta stack must remain on the reviewed Expo SDK 54 / React Native
  0.81 line until an explicit upgrade is reviewed. `expo-dev-client`,
  `expo-screen-capture`, notifications, SecureStore, local authentication,
  image picker, and Expo Router are release dependencies rather than optional
  local tooling.
- `apps/mobile/app.json` must keep the reviewed iOS bundle identifier, Android
  package, semantic version, native build baselines, canonical Mithaq artwork,
  splash configuration, notification plugin, and Face ID permission explanation.
- `apps/mobile/eas.json` must keep `development` as an internal development-client
  profile, `preview` as the internal staging/acceptance profile, and `production`
  as the production profile with native build auto-increment enabled.
- The public website must expose localized privacy, account-deletion, and
  contact/support pages.
- The account-deletion page must direct members to the authenticated in-app
  deletion flow rather than asking them to transmit private account data over an
  unauthenticated public form.
- No service-role key, database password, SMS-provider secret, Apple credential,
  Google Play credential, EAS credential, push token, or worker token may appear
  in mobile source, public variables, store screenshots, or committed metadata.

## EAS project linking gate

Before the first native development build:

- Sign in to the intended Expo account and link this repository to the real
  Mithaq EAS project.
- Confirm linking writes a real `expo.extra.eas.projectId` into the app
  configuration. Never invent or copy a project ID from another app.
- Run `pnpm release:native:check` after linking.
- Keep `com.mithaq.app` as both the iOS bundle identifier and Android package.
- Do not commit Apple credentials, Google signing keys, EAS access tokens, or
  production environment secrets.
- Remote push testing starts only after this gate, because Mithaq deliberately
  refuses to register an Expo push token when the native build has no EAS
  project ID.

## Hosted URLs required for store records

After production hosting exists, derive the final store-review URLs from the
reviewed production origin and verify them over HTTPS before submission:

- Privacy policy: `/en/privacy` and `/ar/privacy`
- Account deletion information: `/en/account-deletion` and
  `/ar/account-deletion`
- Support/contact: `/en/contact` and `/ar/contact`

Use the canonical production origin only. Do not submit preview, staging,
localhost, temporary tunnel, or branch-deployment URLs to either store.

## iOS / App Store Connect operator gates

These require the product owner's Apple credentials and cannot be completed from
source control:

- Confirm the final bundle identifier is registered to the correct Apple
  Developer team before the first signed production build.
- Configure signing certificates/profiles through the approved EAS/Apple
  workflow without committing credentials.
- Create the App Store Connect app record and confirm the bundle ID and
  version/build match the reviewed binary.
- Complete App Privacy declarations based on the actual production data flows
  and SDKs in the submitted binary.
- Provide the production privacy-policy, deletion-information, and support URLs.
- Provide age/category/content declarations that match the actual product
  behavior.
- Upload reviewed screenshots from the signed production build; do not use mock
  screens that promise unshipped behavior.
- Submit first to TestFlight and complete real-device acceptance before public
  review.

## Android / Google Play operator gates

These require the product owner's Google Play credentials and cannot be
completed from source control:

- Confirm `com.mithaq.app` is available/registered in the intended Play Console
  account before the first irreversible production association.
- Configure Play App Signing and EAS credentials without committing private
  keys.
- Create the app record and ensure package, version name, and version code match
  the reviewed binary.
- Complete Data safety declarations based on the actual production data flows
  and SDKs in the submitted binary.
- Provide the production privacy-policy, deletion-information, and support URLs.
- Provide content-rating and target-audience declarations that match the actual
  product behavior.
- Upload reviewed phone screenshots from the signed production build.
- Use internal/closed testing before staged public rollout.

## Final binary acceptance

For both platforms, accept only binaries built from the exact reviewed commit
after hosted staging has passed. On physical devices verify all of the following:

- Arabic RTL and English LTR on small and current-size phones.
- OTP delivery, onboarding, profile review, and returning-session behavior.
- Private First and Open Profile presentation choices.
- Optional photos, replace/reorder/primary-photo controls, and every supported
  photo reveal stage.
- Family Shield pair exclusion and Trusted Circle contact handoff.
- Finite Marriage Discover, interested/not-for-me directional transitions, and
  no endless swipe loop.
- Private introduction acceptance without leaking a one-sided response.
- Mutual acceptance, private conversation, Activity lifecycle, report/block,
  and clean introduction/conversation ending.
- Discreet notifications: Neutral lock-screen copy by default and no member
  name, photo, message text, phone number, or profile facts in push previews.
- Screenshot and screen-record protection on Discover when identifiable content
  is shown, Introductions, mutual handoff, trusted-contact handoff, and private
  conversation.
- iPhone app-switcher privacy and Android Recent Apps secure-window behavior.
- No Save/Share/Open-original path for another member's protected photo.
- Biometric re-entry, logout device-unregistration, offline/recoverable states,
  and account deletion.
- A moderation Ban closes active relationships, prevents participation, and
  requires fresh authentication after a later Restore.
- Every legacy Friendship deep link resolves back into the Marriage product and
  never exposes the dormant Friendship UI.

A second physical device or camera can always photograph a screen. Store copy
must describe screenshot/screen-record prevention accurately and must not claim
that digital content is impossible to copy under all conditions.

If the signed binary behaves differently from the tested source revision, stop
the release and rebuild from a reviewed commit rather than editing store
declarations to fit an unreviewed binary.
