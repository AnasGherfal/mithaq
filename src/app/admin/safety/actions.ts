"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedStatuses = new Set(["triaged", "investigating", "dismissed", "closed"]);

export async function moderateSafetyReport(formData: FormData) {
  const reportId = String(formData.get("report_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!uuidPattern.test(reportId) || !allowedStatuses.has(status) || reason.length > 80) {
    redirect("/admin/safety?error=invalid");
  }

  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/join");

  const { error } = await rpc.rpc("moderate_report_case", {
    p_report_id: reportId,
    p_to_status: status,
    p_reason_code: reason || null,
  });

  if (error) redirect("/admin/safety?error=transition");

  revalidatePath("/admin");
  revalidatePath("/admin/safety");
  redirect("/admin/safety?updated=1");
}
