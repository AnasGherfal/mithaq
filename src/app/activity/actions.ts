"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

export async function markAllActivityRead() {
  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/join");

  const { data: latestData, error: latestError } = await rpc.rpc("list_my_notifications_v2", {
    p_before_created_at: null,
    p_before_notification_id: null,
    p_limit: 1,
  });

  if (latestError || !Array.isArray(latestData) || latestData.length === 0) {
    revalidatePath("/activity");
    return;
  }

  const latest = latestData[0] as { notification_id?: string; created_at?: string };
  if (!latest.notification_id || !latest.created_at) {
    revalidatePath("/activity");
    return;
  }

  await rpc.rpc("mark_my_notifications_read_v2", {
    p_through_created_at: latest.created_at,
    p_through_notification_id: latest.notification_id,
  });

  revalidatePath("/activity");
  revalidatePath("/member");
}
