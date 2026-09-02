# Production OTP Provider Setup

This runbook activates the deployed `send-auth-otp` Supabase Edge Function as the production phone-auth delivery path.

The Edge Function is already designed to receive the Supabase-generated six-digit OTP through the Supabase Auth **Send SMS Hook**, verify the hook signature, and deliver the code through Telegram Gateway and/or direct Meta WhatsApp Cloud API.

Do not put provider credentials in Git, client-side environment files, `NEXT_PUBLIC_*`, or `EXPO_PUBLIC_*` variables.

## Phase 1 — Telegram Gateway (fastest production activation)

Telegram Gateway is a real production verification service. Messages to the Gateway account owner's own Telegram number are free; other delivered verification messages are billed by Telegram.

1. Open `https://gateway.telegram.org/`.
2. Select **Log in to Start** and authenticate with the Telegram account that will own Mithaq's Gateway account.
3. Complete the requested business/service information.
4. Open the Gateway account settings and copy the API access token.
5. Do not paste the token into chat, GitHub, a `.env` committed to Git, or a client app.
6. Add funds through the Gateway account when you are ready to deliver to numbers other than the Gateway owner's own number.

### Add Telegram secret to Supabase

In the `mithaq-staging` Supabase project:

1. Open **Edge Functions**.
2. Open **Secrets**.
3. Add:
   - `TELEGRAM_GATEWAY_ACCESS_TOKEN` = the Gateway token.
   - `OTP_PROVIDER_ORDER` = `telegram` for the first activation.
   - `OTP_TTL_SECONDS` = `60`.
4. Save.

Do not enable the Auth hook until the Telegram secret is saved.

## Phase 2 — Connect Supabase Auth to the Edge Function

In the `mithaq-staging` Supabase project:

1. Open **Authentication → Hooks**.
2. Find/create the **Send SMS** hook.
3. Select **HTTP/HTTPS endpoint**.
4. Use this endpoint:
   `https://pelvtwjibbehtlpfhadg.supabase.co/functions/v1/send-auth-otp`
5. Generate a Standard Webhooks secret in the Supabase hook UI. It should look like `v1,whsec_...`.
6. Copy the full generated value.
7. Open **Edge Functions → Secrets**.
8. Add `SEND_SMS_HOOK_SECRETS` = the full `v1,whsec_...` value.
9. Return to **Authentication → Hooks** and ensure the Send SMS hook is enabled.

Once the hook is enabled, Supabase Auth calls this function instead of its built-in Twilio SMS sender.

## Phase 3 — First real verification

Use a real number that is registered with Telegram and whose owner has consented to receive the Mithaq verification code.

1. Run the Stage N web app.
2. Open `/join` in a clean browser profile.
3. Enter the phone in E.164 format or use a supported Libyan local format.
4. Confirm age 18+.
5. Confirm authentication-message delivery consent.
6. Request the OTP.
7. Check Telegram's verification-code chat for the six-digit code.
8. Enter the code in Mithaq.
9. Verify that Supabase `Authentication → Users` now contains the login-capable Auth user.
10. Inspect Supabase **Authentication logs** and **Edge Function logs** if anything fails.

Do not continue to waitlist/admin testing until this first real login succeeds.

## Phase 4 — Add direct Meta WhatsApp Cloud API

Use Meta WhatsApp Cloud API directly rather than routing WhatsApp through Twilio.

1. Create or use a Meta Business portfolio for Mithaq.
2. Add the WhatsApp Business Platform / WhatsApp product.
3. Create or select the WhatsApp Business Account (WABA).
4. Register a dedicated sender phone number for Mithaq.
5. Create an **AUTHENTICATION** message template with an OTP **COPY_CODE** button.
6. Wait for the template to become approved.
7. Obtain a server-side WhatsApp Cloud API access token.
8. Record the WhatsApp sender **Phone Number ID**.
9. Choose the current Meta Graph API version shown by Meta for the app.
10. Do not expose any Meta access token to web/mobile client code.

### Add Meta secrets to Supabase

Under **Edge Functions → Secrets**, add:

- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `META_GRAPH_API_VERSION`
- `META_WHATSAPP_AUTH_TEMPLATE_NAME`
- `META_WHATSAPP_TEMPLATE_LANGUAGE` (for the first template, normally `en_US` unless an approved Arabic localization is used)

Then change:

- `OTP_PROVIDER_ORDER` = `whatsapp,telegram`

With that order, the hook tries WhatsApp first and Telegram when the WhatsApp API rejects/fails the request synchronously.

Important: a WhatsApp API request being accepted is not the same as final handset delivery. Asynchronous provider delivery reporting and an explicit user-selectable fallback/resend flow should be added before broad public launch.

## Security invariants

- Supabase still creates and verifies OTPs.
- Supabase still issues sessions.
- The Edge Function only delivers the one-time code.
- The hook verifies Standard Webhooks signatures.
- JWT verification is intentionally off for this hook because the hook runs before a user JWT exists.
- Provider credentials exist only in server-side Supabase Edge Function Secrets.
- Phone numbers and OTPs are not persisted by the delivery function.
- Phone numbers and OTPs are not printed in Edge Function logs.
- Marketing consent is separate from authentication-delivery consent.
