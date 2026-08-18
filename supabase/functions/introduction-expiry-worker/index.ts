import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

function logOperationalError(code: string) {
  console.error(`introduction_expiry_worker.${code}`);
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

  if (!supabaseUrl || !serviceRoleKey) {
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

  const { data, error } = await admin.rpc("expire_controlled_introductions", {
    p_limit: 500,
  });

  if (error) {
    logOperationalError("expiry_failed");
    return new Response(JSON.stringify({ error: "expiry_failed" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  return new Response(
    JSON.stringify({ expired: Number(data ?? 0) }),
    { status: 200, headers: jsonHeaders },
  );
});
