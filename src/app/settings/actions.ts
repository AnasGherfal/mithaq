"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requestAccountDeletion(formData: FormData) {
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== "حذف حسابي") {
    redirect("/settings?error=confirmation");
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) {
    redirect("/join");
  }

  const { error } = await supabase.rpc("request_account_deletion", {
    p_locale: "ar",
  });

  if (error) {
    redirect("/settings?error=request");
  }

  await supabase.auth.signOut();
  redirect("/account-deletion-requested");
}
