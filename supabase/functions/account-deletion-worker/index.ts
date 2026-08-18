import { createClient } from "npm:@supabase/supabase-js@2.112.3";

type ClaimedDeletion = {
  request_id: string;
  user_id: string;
};

type WorkerRunStatus = "succeeded" | "partial" | "failed";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

function logOperationalError(code: string) {
  console.error(`account_deletion_worker.${code}`);
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

  async function recordRun(
    runStatus: WorkerRunStatus,
    reconciled: number,
    claimed: number,
    completed: number,
    failed: number,
    errorCode: string | null,
  ) {
    const { error } = await admin.rpc("record_account_deletion_worker_run", {
      p_run_status: runStatus,
      p_reconciled: reconciled,
      p_claimed: claimed,
      p_completed: completed,
      p_failed: failed,
      p_error_code: errorCode,
    });

    if (error) {
      logOperationalError("run_audit_failed");
    }
  }

  let reconciled = 0;
  const { data: reconciliationData, error: reconciliationError } =
    await admin.rpc("reconcile_orphaned_account_deletions", {
      p_limit: 25,
    });

  if (reconciliationError) {
    // Reconciliation repairs a previous run's narrow post-Auth-delete failure
    // window. Log a privacy-safe code, but do not block newly due requests.
    logOperationalError("reconciliation_failed");
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
    logOperationalError("claim_failed");
    const errorCode = reconciliationError
      ? "reconciliation_and_claim_failed"
      : "claim_failed";
    await recordRun("failed", reconciled, 0, 0, 0, errorCode);
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
      logOperationalError("private_data_purge_failed");
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
      logOperationalError("auth_delete_failed");
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
      logOperationalError("tombstone_completion_failed");
      results.push({ requestId: item.request_id, status: "failed" });
      continue;
    }

    results.push({ requestId: item.request_id, status: "completed" });
  }

  const completed = results.filter(
    (result) => result.status === "completed",
  ).length;
  const failed = results.filter((result) => result.status === "failed").length;
  const runStatus: WorkerRunStatus =
    reconciliationError || failed > 0 ? "partial" : "succeeded";

  let errorCode: string | null = null;
  if (reconciliationError && failed > 0) {
    errorCode = "reconciliation_and_item_failures";
  } else if (reconciliationError) {
    errorCode = "reconciliation_failed";
  } else if (failed > 0) {
    errorCode = "item_failures";
  }

  await recordRun(
    runStatus,
    reconciled,
    claimed.length,
    completed,
    failed,
    errorCode,
  );

  return new Response(
    JSON.stringify({
      reconciled,
      claimed: claimed.length,
      completed,
      failed,
    }),
    { status: 200, headers: jsonHeaders },
  );
});
