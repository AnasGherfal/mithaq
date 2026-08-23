import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const memberPhotoBucket = "member-profile-photos";
const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

type CleanupJob = {
  job_id: string;
  storage_path: string;
};

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
    console.error("member_photo_cleanup.configuration_missing");
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
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error: claimError } = await admin.rpc(
    "claim_member_photo_cleanup_jobs",
    { p_limit: 25 },
  );

  if (claimError) {
    console.error("member_photo_cleanup.claim_failed");
    return new Response(JSON.stringify({ error: "claim_failed" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const jobs = (data ?? []) as CleanupJob[];
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    const { error: removeError } = await admin.storage
      .from(memberPhotoBucket)
      .remove([job.storage_path]);

    if (removeError) {
      failed += 1;
      console.error("member_photo_cleanup.remove_failed");
      await admin.rpc("fail_member_photo_cleanup_job", {
        p_job_id: job.job_id,
        p_error_code: "storage_remove_failed",
      });
      continue;
    }

    const { error: completeError } = await admin.rpc(
      "complete_member_photo_cleanup_job",
      { p_job_id: job.job_id },
    );

    if (completeError) {
      failed += 1;
      console.error("member_photo_cleanup.complete_failed");
      continue;
    }

    completed += 1;
  }

  return new Response(
    JSON.stringify({ claimed: jobs.length, completed, failed }),
    { status: 200, headers: jsonHeaders },
  );
});
