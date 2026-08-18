# Mithaq Mobile

Official iOS and Android member app for Mithaq, built with Expo and React Native.

## Current foundation

- Arabic-first welcome experience with English parity
- Expo Router navigation
- Supabase phone OTP authentication
- Supabase session persistence in chunked Expo SecureStore storage
- Full native three-step waitlist questionnaire
- Returning-user questionnaire hydration and editing
- Native consent/finalization and success flow
- Authenticated waitlist status backed by the existing RLS-protected database
- Shared Mithaq visual tokens and privacy language

This app uses the same Supabase Auth users, Postgres tables and RLS policies as the web application. It does not introduce a second backend.

## Local Supabase

Start the repository's local Supabase stack from the repository root first:

```powershell
pnpm db:start
pnpm supabase status
```

Create the mobile environment file:

```powershell
cd apps/mobile
Copy-Item .env.example .env
```

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using the local Supabase project URL and publishable/anon key. Never use the secret/service-role key in the mobile app.

## Android acceptance test

For a physical Android phone on the same Wi-Fi network, `127.0.0.1` refers to the phone itself. Use your computer's LAN IP instead, for example:

```env
EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.177:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Allow inbound access to the Supabase port through Windows Firewall when prompted. For the standard Android emulator, use `http://10.0.2.2:54321` instead of the computer LAN IP.

Install the standalone mobile package and start Expo:

```powershell
npm install
npm start
```

Then open the project on Android and verify this full path:

1. Arabic welcome screen and English language switch.
2. Phone sign-in with the local deterministic test number.
3. OTP verification.
4. All three questionnaire steps, including validation and RTL layout.
5. Consent and waitlist finalization.
6. Success screen and account status.
7. Reopen/edit the questionnaire and confirm saved answers are restored.
8. Close/reopen the app and confirm the authenticated session is restored.
9. Sign out and confirm private screens are no longer accessible.

Local deterministic credentials:

```text
Phone: +218910000001
OTP:   123456
```

## iOS acceptance test

Use the same flow on iOS. A physical iPhone also needs the computer LAN IP. The iOS Simulator can normally reach the Mac host through `127.0.0.1`; Windows cannot run the iOS Simulator, so physical-device or macOS CI/device testing is required for final iOS acceptance.

Acceptance requires the same Arabic/English navigation, OTP, questionnaire, consent, session persistence, edit flow and sign-out behavior as Android.

## Pre-device checks

From `apps/mobile`:

```powershell
npm run typecheck
npm run format:check
npx expo-doctor@latest
```

## Product boundary

The current mobile milestone intentionally does not add public profiles, matching, messaging, photos, identity-document collection, payments or admin analytics. Push notifications and biometric re-entry are the next native platform foundations after device acceptance is stable.
