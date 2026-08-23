"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { WaitlistStatus } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const adminStatuses: WaitlistStatus[] = ["submitted", "qualified", "invited", "declined"];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function setWaitlistStatus(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const targetStatus = String(formData.get("target_status") ?? "") as WaitlistStatus;
  const currentFilter = String(formData.get("current_filter") ?? "");

  const filterSuffix = adminStatuses.includes(currentFilter as WaitlistStatus)
    ? `&status=${encodeURIComponent(currentFilter)}`
    : "";

  if (!uuidPattern.test(applicationId) || !adminStatuses.includes(targetStatus)) {
    redirect(`/admin?error=invalid${filterSuffix}`);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) {
    redirect("/join");
  }

  const { error } = await supabase.rpc("admin_set_waitlist_status", {
    p_application_id: applicationId,
    p_to_status: targetStatus,
  });

  if (error) {
    redirect(`/admin?error=transition${filterSuffix}`);
  }

  revalidatePath("/admin");
  revalidatePath("/waitlist");
  redirect(`/admin?updated=1${filterSuffix}`);
}
