# Mithaq Mobile

Official iOS and Android member app for Mithaq, built with Expo and React Native.

## Current foundation

- Arabic-first welcome experience with English parity
- Expo Router navigation
- Supabase phone OTP authentication
- Supabase session persistence in chunked Expo SecureStore storage
- Authenticated waitlist status backed by the existing RLS-protected database
- Shared Mithaq visual tokens and privacy language

This app uses the same Supabase Auth users, Postgres tables and RLS policies as the web application. It does not introduce a second backend.

## Local setup

Start the repository's local Supabase stack from the repository root first:

```powershell
pnpm db:start
pnpm supabase status
```

Then create the mobile environment file:

```powershell
cd apps/mobile
Copy-Item .env.example .env
```

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using the local Supabase API URL and publishable/anon key. Never use the secret/service-role key in the mobile app.

When testing on a physical phone, `127.0.0.1` refers to the phone itself. Replace the local Supabase hostname with your computer's LAN IP, for example `http://192.168.1.177:54321`, and make sure Windows Firewall allows the connection.

Install and run the app:

```powershell
pnpm install
pnpm start
```

For the local deterministic OTP flow used by the web integration suite:

```text
Phone: +218910000001
OTP:   123456
```

## Product boundary

The mobile foundation intentionally does not add public profiles, matching, messaging, photos, identity-document collection, payments or admin analytics. Those require their own product/security milestones.
