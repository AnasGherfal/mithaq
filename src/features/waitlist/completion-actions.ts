"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordReferralMilestone } from "./referral-actions";

const localeSchema = z.enum(["ar", "en"]);

export async function finalizeWaitlist(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale"));
  const communications = formData.get("communications") === "on";
  const requiredConsent = formData.get("requiredConsent") === "on";

  if (!requiredConsent) {
    redirect(`/${locale}/waitlist/consent?error=required`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect(`/${locale}/waitlist?error=session`);
  }

  const { error } = await supabase.rpc("finalize_waitlist", {
    p_locale: locale,
    p_communications: communications,
  });

  if (error) {
    redirect(`/${locale}/waitlist/consent?error=finalize`);
  }

  await recordReferralMilestone("submitted");
  redirect(`/${locale}/waitlist/success`);
}

export async function withdrawCommunications(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale"));
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect(`/${locale}/waitlist?error=session`);
  }

  const { error } = await supabase.rpc("withdraw_communications_consent", {
    p_locale: locale,
  });

  if (error) {
    redirect(`/${locale}/waitlist/status?error=communications`);
  }

  redirect(`/${locale}/waitlist/status?communications=withdrawn`);
}

export async function requestDeletion(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale"));
  const scope = z
    .enum(["waitlist_data", "entire_account"])
    .parse(formData.get("scope"));

  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect(`/${locale}/waitlist?error=session`);
  }

  const { error } = await supabase.from("deletion_requests").insert({
    user_id: userId,
    request_scope: scope,
    status: "requested",
  });

  if (error) {
    redirect(`/${locale}/waitlist/status?error=deletion`);
  }

  redirect(`/${locale}/waitlist/status?deletion=requested`);
}
