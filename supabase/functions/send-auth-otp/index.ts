import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type SendSmsHookPayload = {
  user: {
    phone?: string | null;
  };
  sms: {
    otp?: string | null;
  };
};

type ProviderResult =
  | { ok: true; provider: "telegram" | "whatsapp" }
  | { ok: false; provider: "telegram" | "whatsapp"; retryable: boolean; reason: string };

const jsonHeaders = { "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: { message: "Method not allowed" } }, 405);
  }

  const rawPayload = await req.text();

  let event: SendSmsHookPayload;
  try {
    event = verifyHook(rawPayload, req.headers) as SendSmsHookPayload;
  } catch {
    // Never log the payload: it contains a phone number and one-time code.
    console.error("send-auth-otp: webhook signature verification failed");
    return jsonResponse({ error: { message: "Invalid hook signature" } }, 401);
  }

  const rawPhone = event?.user?.phone?.trim() ?? "";
  const phone = normalizeHookPhone(rawPhone);
  const otp = event?.sms?.otp?.trim() ?? "";

  // Supabase Auth may pass its internally-normalized phone without a leading +.
  // Log only shape metadata so failures can be diagnosed without exposing secrets.
  if (!phone || !/^\d{6,10}$/.test(otp)) {
    const phoneDigits = rawPhone.replace(/\D/g, "");
    console.error(
      `send-auth-otp: invalid auth message shape phone_present=${rawPhone.length > 0} phone_has_plus=${rawPhone.startsWith("+")} phone_digits=${phoneDigits.length} otp_digits=${otp.replace(/\D/g, "").length}`,
    );
    return jsonResponse({ error: { message: "Invalid authentication message" } }, 400);
  }

  const providers = configuredProviderOrder();
  if (providers.length === 0) {
    console.error("send-auth-otp: no OTP delivery provider is configured");
    return retryableError("OTP delivery is not configured");
  }

  const failures: ProviderResult[] = [];

  for (const provider of providers) {
    let result: ProviderResult;
    try {
      result = provider === "telegram"
        ? await sendTelegramOtp(phone, otp)
        : await sendWhatsAppOtp(phone, otp);
    } catch {
      result = {
        ok: false,
        provider,
        retryable: true,
        reason: "PROVIDER_REQUEST_FAILED",
      };
    }

    if (result.ok) {
      // Do not log phone number, OTP, message ID, or provider response payload.
      console.info(`send-auth-otp: accepted by ${result.provider}`);
      return jsonResponse({}, 200);
    }

    // Provider reason is sanitized to an uppercase code or HTTP status only.
    console.warn(
      `send-auth-otp: ${result.provider} failed reason=${safeReason(result.reason)} (${result.retryable ? "retryable" : "non-retryable"})`,
    );
    failures.push(result);
  }

  const retryable = failures.some((failure) => !failure.ok && failure.retryable);
  if (retryable) return retryableError("Authentication message delivery failed");

  return jsonResponse({ error: { message: "Authentication message could not be delivered" } }, 502);
});

function verifyHook(payload: string, headers: Headers) {
  const configured =
    Deno.env.get("SEND_SMS_HOOK_SECRETS") ?? Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "";
  const firstSecret = configured.split("|")[0]?.trim();
  if (!firstSecret) throw new Error("Missing hook secret");

  const secret = firstSecret.replace(/^v1,whsec_/, "");
  const webhook = new Webhook(secret);
  return webhook.verify(payload, Object.fromEntries(headers.entries()));
}

function normalizeHookPhone(value: string) {
  // Supabase's hook docs show +E.164, while Auth internals/provider adapters can
  // carry the normalized digits only. Accept only those two strict forms.
  if (/^\+[1-9]\d{7,14}$/.test(value)) return value;
  if (/^[1-9]\d{7,14}$/.test(value)) return `+${value}`;
  return null;
}

function configuredProviderOrder(): Array<"telegram" | "whatsapp"> {
  const requested = (Deno.env.get("OTP_PROVIDER_ORDER") ?? "whatsapp,telegram")
    .split(",")
    .map((value) => value.trim().toLowerCase());

  const order: Array<"telegram" | "whatsapp"> = [];
  for (const value of requested) {
    if (value === "telegram" && telegramConfigured() && !order.includes("telegram")) {
      order.push("telegram");
    }
    if (value === "whatsapp" && whatsappConfigured() && !order.includes("whatsapp")) {
      order.push("whatsapp");
    }
  }
  return order;
}

function telegramConfigured() {
  return Boolean(Deno.env.get("TELEGRAM_GATEWAY_ACCESS_TOKEN"));
}

function whatsappConfigured() {
  return Boolean(
    Deno.env.get("META_WHATSAPP_ACCESS_TOKEN") &&
      Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID") &&
      Deno.env.get("META_GRAPH_API_VERSION") &&
      Deno.env.get("META_WHATSAPP_AUTH_TEMPLATE_NAME"),
  );
}

async function sendTelegramOtp(phone: string, otp: string): Promise<ProviderResult> {
  const token = Deno.env.get("TELEGRAM_GATEWAY_ACCESS_TOKEN");
  if (!token) {
    return { ok: false, provider: "telegram", retryable: false, reason: "NOT_CONFIGURED" };
  }

  // Telegram recommends checking whether the number can receive Gateway messages.
  // A successful check reserves one charge; using its request_id for the send does
  // not charge a second time. Failed ability checks are not charged.
  const abilityResponse = await fetch("https://gatewayapi.telegram.org/checkSendAbility", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone_number: phone }),
  });
  const abilityBody = await safeJson(abilityResponse);

  if (!abilityResponse.ok || abilityBody?.ok !== true) {
    return {
      ok: false,
      provider: "telegram",
      retryable: abilityResponse.status === 429 || abilityResponse.status >= 500,
      reason: telegramErrorCode(abilityBody, abilityResponse.status),
    };
  }

  const requestId = abilityBody?.result?.request_id;
  if (typeof requestId !== "string" || requestId.length === 0) {
    return {
      ok: false,
      provider: "telegram",
      retryable: false,
      reason: "ABILITY_RESPONSE_INVALID",
    };
  }

  const ttl = clampNumber(Deno.env.get("OTP_TTL_SECONDS"), 60, 30, 3600);
  const response = await fetch("https://gatewayapi.telegram.org/sendVerificationMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone_number: phone,
      request_id: requestId,
      code: otp,
      ttl,
    }),
  });

  const body = await safeJson(response);
  if (response.ok && body?.ok === true) {
    return { ok: true, provider: "telegram" };
  }

  return {
    ok: false,
    provider: "telegram",
    retryable: response.status === 429 || response.status >= 500,
    reason: telegramErrorCode(body, response.status),
  };
}

function telegramErrorCode(body: any, status: number) {
  const candidate = typeof body?.error === "string" ? body.error.trim() : "";
  return /^[A-Z0-9_]{1,80}$/.test(candidate) ? candidate : `HTTP_${status}`;
}

function safeReason(value: string) {
  return /^[A-Z0-9_]{1,80}$/.test(value) ? value : "UNSPECIFIED";
}

async function sendWhatsAppOtp(phone: string, otp: string): Promise<ProviderResult> {
  const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
  const apiVersion = Deno.env.get("META_GRAPH_API_VERSION");
  const templateName = Deno.env.get("META_WHATSAPP_AUTH_TEMPLATE_NAME");
  const languageCode = Deno.env.get("META_WHATSAPP_TEMPLATE_LANGUAGE") ?? "en_US";

  if (!accessToken || !phoneNumberId || !apiVersion || !templateName) {
    return { ok: false, provider: "whatsapp", retryable: false, reason: "NOT_CONFIGURED" };
  }

  const endpoint = `https://graph.facebook.com/${encodeURIComponent(apiVersion)}/${encodeURIComponent(phoneNumberId)}/messages`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone.replace(/^\+/, ""),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: otp }],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: otp }],
          },
        ],
      },
    }),
  });

  const body = await safeJson(response);
  const accepted =
    response.ok && Array.isArray(body?.messages) && typeof body.messages[0]?.id === "string";
  if (accepted) return { ok: true, provider: "whatsapp" };

  return {
    ok: false,
    provider: "whatsapp",
    retryable: response.status === 429 || response.status >= 500,
    reason: `HTTP_${response.status}`,
  };
}

function retryableError(message: string) {
  return new Response(JSON.stringify({ error: { message } }), {
    status: 503,
    headers: { ...jsonHeaders, "retry-after": "true" },
  });
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function safeJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function clampNumber(raw: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}
