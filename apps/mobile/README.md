# Mithaq Mobile

> **Disposable Expo Go preview branch:** `agent/ios-expo-go-preview` exists only to let the current Mithaq UI and member flows run in the App Store version of Expo Go on a physical iPhone without changing the real SDK 57 release branch. This branch targets Expo SDK 54 / React Native 0.81 / React 19.1. Do not merge its dependency downgrade back into `agent/mobile-app-foundation`.
>
> Expo Go is not a release-equivalent test environment. In particular, Face ID authentication itself cannot be validated in Expo Go on iOS. Final biometrics, standalone behavior, signing, push delivery, splash behavior, and store acceptance must still be tested with signed development/preview/production builds.

Official iOS and Android member app for Mithaq, built with Expo and React Native.

## Free physical-iPhone Expo Go test

From the repository root:

```powershell
git fetch origin
git checkout agent/ios-expo-go-preview
git pull origin agent/ios-expo-go-preview
cd apps/mobile
```

This disposable branch intentionally does not rely on the SDK 57 npm lockfile. Start from a clean generated dependency tree:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
npx expo install --fix
npx expo-doctor@latest
```

Then configure the same browser-safe Supabase environment values you want this phone to reach. For a physical iPhone using local Supabase, `127.0.0.1` points to the phone itself, so use the Windows PC LAN IP. Hosted `mithaq-staging` is preferred once available.

Start the Expo Go development server with:

```powershell
npx expo start --clear
```

Scan the QR code using the iPhone camera / Expo Go. If LAN discovery is blocked by the network, try:

```powershell
npx expo start --tunnel --clear
```

### What this branch is for

Use it to evaluate:

- Arabic RTL and English LTR presentation
- screen hierarchy, spacing, typography and premium feel
- navigation
- OTP UI and Supabase flows when the selected backend is reachable
- questionnaire, consent and profile flows
- introductions, conversations, Activity Center and safety surfaces
- loading/error/empty states
- session persistence through Expo SecureStore

Do **not** use this branch as proof of:

- Face ID behavior on iOS
- signed standalone application behavior
- production splash-screen behavior
- push-notification delivery
- TestFlight/App Store readiness
- SDK 57 release compatibility

When testing is finished, return to the real product branch:

```powershell
cd C:\Users\anas2\mithaq
git checkout agent/mobile-app-foundation
git pull origin agent/mobile-app-foundation
```

## Current foundation

- Arabic-first welcome experience with English parity
- Expo Router navigation
- Supabase phone OTP authentication
- Supabase session persistence in chunked Expo SecureStore storage
- Full native member onboarding and private account flows
- Private profiles, controlled introductions, conversations and activity
- Trust/safety and privacy controls
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

## Physical-device local backend

For a physical phone on the same Wi-Fi network, `127.0.0.1` refers to the phone itself. Use your computer's LAN IP instead, for example:

```env
EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.177:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Allow inbound access to the Supabase port through Windows Firewall when prompted.

## Pre-device checks

From `apps/mobile`:

```powershell
npm run typecheck
npm run format:check
npx expo-doctor@latest
```

## Production branch

The release source of truth remains `agent/mobile-app-foundation` on Expo SDK 57. All permanent fixes and production release work belong there, not on this Expo Go compatibility branch.
