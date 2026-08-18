import { createClient } from "npm:@supabase/supabase-js@2.112.3";

type ClaimedDeletion = {
  request_id: string;
  user_id: string;
};

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

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
    console.error(
      "Account deletion worker is missing required server-side environment variables.",
    );
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

  let reconciled = 0;
  const { data: reconciliationData, error: reconciliationError } = await admin.rpc(
    "reconcile_orphaned_account_deletions",
    {
      p_limit: 25,
    },
  );

  if (reconciliationError) {
    // Reconciliation repairs a previous run's narrow post-Auth-delete failure
    // window. Log it loudly, but do not block newly due deletion requests.
    console.error(
      "Could not reconcile interrupted account deletions",
      reconciliationError.message,
    );
  } else {
    reconciled = Number(reconciliationData ?? 0);
  }

  const { data, error: claimError } = await admin.rpc(
    "claim_due_account_deletions",
    {
      p_limit: 25,
    },
  );

  if (claimError) {
    console.error("Could not claim due account deletions", claimError.message);
    return new Response(JSON.stringify({ error: "claim_failed", reconciled }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const claimed = (data ?? []) as ClaimedDeletion[];
  const results: Array<{
    requestId: string;
    status: "completed" | "failed";
  }> = [];

  for (const item of claimed) {
    const { error: purgeError } = await admin.rpc(
      "purge_account_private_data",
      {
        p_user_id: item.user_id,
      },
    );

    if (purgeError) {
      console.error(
        "Could not purge private account data",
        item.request_id,
        purgeError.message,
      );
      await admin.rpc("mark_account_deletion_failed", {
        p_request_id: item.request_id,
        p_error_code: "private_data_purge_failed",
      });
      results.push({ requestId: item.request_id, status: "failed" });
      continue;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(
      item.user_id,
    );

    if (deleteError) {
      console.error(
        "Could not delete auth user",
        item.request_id,
        deleteError.message,
      );
      await admin.rpc("mark_account_deletion_failed", {
        p_request_id: item.request_id,
        p_error_code: "auth_delete_failed",
      });
      results.push({ requestId: item.request_id, status: "failed" });
      continue;
    }

    const { error: completeError } = await admin.rpc(
      "mark_account_deletion_completed",
      {
        p_request_id: item.request_id,
      },
    );

    if (completeError) {
      // Auth deletion has already succeeded, so the public request may have
      // cascaded away. A later worker invocation will finalize the surviving
      // private tombstone through reconcile_orphaned_account_deletions().
      console.error(
        "Auth user deleted but tombstone completion failed",
        item.request_id,
        completeError.message,
      );
      results.push({ requestId: item.request_id, status: "failed" });
      continue;
    }

    results.push({ requestId: item.request_id, status: "completed" });
  }

  return new Response(
    JSON.stringify({
      reconciled,
      claimed: claimed.length,
      completed: results.filter((result) => result.status === "completed")
        .length,
      failed: results.filter((result) => result.status === "failed").length,
    }),
    { status: 200, headers: jsonHeaders },
  );
});
