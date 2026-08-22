import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const expoPushEndpoint = "https://exp.host/--/api/v2/push/send";
const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

type ClaimedDelivery = {
  delivery_id: string;
  expo_push_token: string;
  notification_kind: string;
  introduction_id: string;
  preview_mode: string;
  preferred_locale: string;
};

type ExpoTicket = {
  status?: unknown;
  message?: unknown;
  details?: { error?: unknown } | null;
};

type ExpoResponse = {
  data?: unknown;
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function logOperationalError(code: string) {
  console.error(`push_notification_worker.${code}`);
}

function pushBody(row: ClaimedDelivery) {
  const ar = row.preferred_locale !== "en";
  const neutral = row.preview_mode !== "detailed";

  if (neutral) {
    return ar ? "لديك تحديث جديد." : "You have a new update.";
  }

  if (row.notification_kind === "message_received") {
    return ar ? "لديك رسالة خاصة جديدة." : "You have a new private message.";
  }

  if (row.notification_kind === "introduction_mutually_accepted") {
    return ar
      ? "أصبح تعارف خاص جاهزاً للخطوة التالية."
      : "A private introduction is ready for the next step.";
  }

  return ar
    ? "يوجد تعارف خاص جديد جاهز للمراجعة."
    : "A new private introduction is ready to review.";
}

function pushRoute(kind: string) {
  if (kind === "message_received") return "conversation";
  if (kind === "introduction_mutually_accepted") return "introduction-handoff";
  return "introductions";
}

function buildPushMessage(row: ClaimedDelivery) {
  const ar = row.preferred_locale !== "en";
  return {
    to: row.expo_push_token,
    title: ar ? "ميثاق" : "Mithaq",
    body: pushBody(row),
    sound: null,
    priority: "default",
    ttl: 3600,
    channelId: "private-updates",
    data: {
      route: pushRoute(row.notification_kind),
      introductionId: row.introduction_id,
      notificationKind: row.notification_kind,
      locale: ar ? "ar" : "en",
    },
  };
}

function readTickets(payload: ExpoResponse, expected: number): ExpoTicket[] | null {
  if (!Array.isArray(payload.data) || payload.data.length !== expected) return null;
  return payload.data.map((ticket) =>
    ticket && typeof ticket === "object" ? (ticket as ExpoTicket) : {},
  );
}

function ticketOutcome(ticket: ExpoTicket) {
  if (ticket.status === "ok") {
    return { outcome: "sent", errorCode: null } as const;
  }

  const errorCode =
    ticket.details && typeof ticket.details.error === "string"
      ? ticket.details.error
      : "expo_push_error";

  if (errorCode === "DeviceNotRegistered") {
    return { outcome: "device_invalid", errorCode } as const;
  }

  if (errorCode === "MessageTooBig" || errorCode === "InvalidCredentials") {
    return { outcome: "failed", errorCode } as const;
  }

  return { outcome: "retry", errorCode } as const;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return response({ error: "method_not_allowed" }, 405);
  }

  const workerToken = request.headers.get("x-mithaq-worker-token")?.trim() ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!workerToken || !supabaseUrl || !serviceRoleKey) {
    return response({ error: "unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.rpc("claim_member_push_deliveries", {
    p_worker_token: workerToken,
    p_limit: 100,
  });

  if (error) {
    if (error.message.toLowerCase().includes("unauthorized")) {
      return response({ error: "unauthorized" }, 401);
    }
    logOperationalError("claim_failed");
    return response({ error: "claim_failed" }, 500);
  }

  const rows = (data ?? []) as ClaimedDelivery[];
  if (rows.length === 0) {
    return response({ claimed: 0, sent: 0, retried: 0, failed: 0 });
  }

  const expoHeaders: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    "accept-encoding": "gzip, deflate",
  };
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN")?.trim();
  if (expoAccessToken) {
    expoHeaders.authorization = `Bearer ${expoAccessToken}`;
  }

  let expoResponse: Response;
  try {
    expoResponse = await fetch(expoPushEndpoint, {
      method: "POST",
      headers: expoHeaders,
      body: JSON.stringify(rows.map(buildPushMessage)),
    });
  } catch {
    logOperationalError("expo_network_failed");
    await Promise.all(
      rows.map((row) =>
        admin.rpc("finish_member_push_delivery", {
          p_worker_token: workerToken,
          p_delivery_id: row.delivery_id,
          p_outcome: "retry",
          p_error_code: "expo_network_failed",
        }),
      ),
    );
    return response({ error: "delivery_temporarily_unavailable" }, 503);
  }

  if (!expoResponse.ok) {
    logOperationalError("expo_http_failed");
    await Promise.all(
      rows.map((row) =>
        admin.rpc("finish_member_push_delivery", {
          p_worker_token: workerToken,
          p_delivery_id: row.delivery_id,
          p_outcome: expoResponse.status >= 500 ? "retry" : "failed",
          p_error_code: `expo_http_${expoResponse.status}`,
        }),
      ),
    );
    return response({ error: "delivery_failed" }, 502);
  }

  let payload: ExpoResponse;
  try {
    payload = (await expoResponse.json()) as ExpoResponse;
  } catch {
    payload = {};
  }

  const tickets = readTickets(payload, rows.length);
  if (!tickets) {
    logOperationalError("expo_response_invalid");
    await Promise.all(
      rows.map((row) =>
        admin.rpc("finish_member_push_delivery", {
          p_worker_token: workerToken,
          p_delivery_id: row.delivery_id,
          p_outcome: "retry",
          p_error_code: "expo_response_invalid",
        }),
      ),
    );
    return response({ error: "delivery_temporarily_unavailable" }, 503);
  }

  let sent = 0;
  let retried = 0;
  let failed = 0;

  await Promise.all(
    rows.map(async (row, index) => {
      const result = ticketOutcome(tickets[index] ?? {});
      if (result.outcome === "sent") sent += 1;
      else if (result.outcome === "retry") retried += 1;
      else failed += 1;

      const { error: finishError } = await admin.rpc("finish_member_push_delivery", {
        p_worker_token: workerToken,
        p_delivery_id: row.delivery_id,
        p_outcome: result.outcome,
        p_error_code: result.errorCode,
      });
      if (finishError) logOperationalError("finish_failed");
    }),
  );

  return response({ claimed: rows.length, sent, retried, failed });
});
