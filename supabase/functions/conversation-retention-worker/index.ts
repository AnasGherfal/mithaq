import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const millisecondsPerDay = 86_400_000;

function logOperationalError(code: string) {
  console.error(`conversation_retention_worker.${code}`);
}

function readRetentionDays() {
  const rawValue = Deno.env.get("MITHAQ_CONVERSATION_RETENTION_DAYS")?.trim();
  const days = Number(rawValue);

  if (!rawValue || !Number.isSafeInteger(days) || days < 1) {
    return null;
  }

  const cutoffMs = Date.now() - days * millisecondsPerDay;
  if (!Number.isFinite(cutoffMs)) {
    return null;
  }

  return new Date(cutoffMs).toISOString();
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const closedBefore = readRetentionDays();

  if (!supabaseUrl || !serviceRoleKey || !closedBefore) {
    logOperationalError("configuration_missing");
    return new Response(JSON.stringify({ error: "worker_not_configured" }), {
      status: 503,
      headers: jsonHeaders,
    });
  }

  if (request.headers.get("authorization") !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await admin.rpc(
    "purge_closed_conversation_messages",
    {
      p_closed_before: closedBefore,
      p_limit: 500,
    },
  );

  if (error) {
    logOperationalError("retention_failed");
    return new Response(JSON.stringify({ error: "retention_failed" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  return new Response(JSON.stringify({ messagesDeleted: Number(data ?? 0) }), {
    status: 200,
    headers: jsonHeaders,
  });
});
