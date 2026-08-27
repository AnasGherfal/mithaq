# Production Auth OTP Delivery

`send-auth-otp` is the HTTP implementation for Supabase Auth's **Send SMS Hook**.

Supabase continues to generate and verify the OTP and issue the session. This function only delivers the Supabase-generated six-digit code through an external messaging provider.

## Supported providers

- Direct Meta WhatsApp Cloud API authentication template
- Telegram Gateway `sendVerificationMessage`

Provider order is controlled by `OTP_PROVIDER_ORDER` and defaults to:

```text
whatsapp,telegram
```

Fallback happens only when the primary provider rejects/fails the API request synchronously. A provider accepting a request does not prove final handset delivery; asynchronous delivery monitoring is a separate operational concern.

## Required hook secret

When the HTTP Send SMS Hook is created in Supabase Dashboard, Supabase generates a Standard Webhooks secret. Store the full value as an Edge Function secret:

```text
SEND_SMS_HOOK_SECRETS=v1,whsec_...
```

The function verifies `webhook-id`, `webhook-timestamp`, and `webhook-signature` before reading the OTP payload. JWT verification must remain disabled for this Edge Function because the hook runs before a user JWT exists.

## Telegram Gateway secrets

```text
TELEGRAM_GATEWAY_ACCESS_TOKEN=...
```

Optional:

```text
OTP_TTL_SECONDS=60
```

Telegram accepts the exact Supabase-generated code. Numbers must be E.164. Users must have voluntarily supplied their number and agreed to receive verification via Telegram.

## Meta WhatsApp Cloud API secrets

```text
META_WHATSAPP_ACCESS_TOKEN=...
META_WHATSAPP_PHONE_NUMBER_ID=...
META_GRAPH_API_VERSION=...
META_WHATSAPP_AUTH_TEMPLATE_NAME=...
META_WHATSAPP_TEMPLATE_LANGUAGE=en_US
```

`META_GRAPH_API_VERSION` is deliberately configuration rather than a hard-coded version so API upgrades are explicit.

Use a Meta **AUTHENTICATION** template with an OTP copy-code button. Template creation and approval happen in the Meta WhatsApp Manager / Graph API, not in this repository.

## Privacy

The function intentionally does not persist or print:

- phone numbers
- OTP values
- external message IDs
- provider response payloads

Logs contain provider-level success/failure only.

## Hosted staging activation sequence

1. Deploy the Edge Function with JWT verification disabled.
2. Create Telegram Gateway and/or Meta WhatsApp credentials.
3. Add provider credentials in Supabase Edge Function Secrets.
4. In Supabase Dashboard open **Authentication → Hooks**.
5. Create/enable **Send SMS** as an HTTP hook pointing at:
   `https://pelvtwjibbehtlpfhadg.supabase.co/functions/v1/send-auth-otp`
6. Generate the hook secret.
7. Add the generated full hook secret to Edge Function Secrets as `SEND_SMS_HOOK_SECRETS`.
8. Only after secrets are present, enable the hook.
9. Request a real phone OTP and inspect Supabase Auth + Edge Function logs.

Do not enable the hook while no delivery provider is configured; the function intentionally returns `503` in that state rather than silently dropping login codes.
