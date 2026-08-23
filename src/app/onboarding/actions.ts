"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(50),
  aboutMe: z.string().trim().min(40).max(600),
  occupation: z.string().trim().max(100),
  education: z.string().trim().max(100),
});

const prioritiesSchema = z.object({
  livingArrangement: z.enum([
    "independent_home",
    "with_family_initially",
    "with_family_long_term",
    "flexible",
  ]),
  childrenPlan: z.enum(["want_children", "do_not_want_children", "unsure"]),
  workAfterMarriage: z.enum([
    "both_work",
    "one_may_pause",
    "open_to_discuss",
    "no_preference",
  ]),
  weddingStyle: z.enum(["simple", "moderate", "large", "discuss_together"]),
});

const privacySchema = z.object({
  visibility: z.enum(["standard", "private"]),
  shareOccupation: z.boolean(),
  shareEducation: z.boolean(),
  shareOriginRegion: z.boolean(),
});

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

async function requireInvitedUser() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/join");

  const { data: application } = await supabase
    .from("waitlist_applications")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  if (application?.status !== "invited") redirect("/waitlist");

  return { supabase, userId };
}

export async function saveProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("display_name"),
    aboutMe: formData.get("about_me"),
    occupation: formData.get("occupation") ?? "",
    education: formData.get("education") ?? "",
  });

  if (!parsed.success) redirect("/onboarding?step=profile&error=profile");

  const { supabase } = await requireInvitedUser();
  const { error: joinError } = await supabase.rpc("join_my_connection_space", {
    p_space: "marriage",
  });

  if (joinError) redirect("/onboarding?step=profile&error=invite");

  const { error } = await supabase.rpc("save_member_profile", {
    p_display_name: parsed.data.displayName,
    p_about_me: parsed.data.aboutMe,
    p_occupation: parsed.data.occupation || null,
    p_education: parsed.data.education || null,
  });

  if (error) redirect("/onboarding?step=profile&error=save");

  revalidatePath("/onboarding");
  redirect("/onboarding?step=priorities");
}

export async function savePriorities(formData: FormData) {
  const parsed = prioritiesSchema.safeParse({
    livingArrangement: formData.get("living_arrangement"),
    childrenPlan: formData.get("children_plan"),
    workAfterMarriage: formData.get("work_after_marriage"),
    weddingStyle: formData.get("wedding_style"),
  });

  if (!parsed.success) redirect("/onboarding?step=priorities&error=priorities");

  const { supabase } = await requireInvitedUser();
  const { error: joinError } = await supabase.rpc("join_my_connection_space", {
    p_space: "marriage",
  });

  if (joinError) redirect("/onboarding?step=priorities&error=invite");

  const { error } = await supabase.rpc("save_my_marriage_practical_priorities", {
    p_living_arrangement: parsed.data.livingArrangement,
    p_children_plan: parsed.data.childrenPlan,
    p_work_after_marriage: parsed.data.workAfterMarriage,
    p_wedding_style: parsed.data.weddingStyle,
  });

  if (error) redirect("/onboarding?step=priorities&error=save");

  revalidatePath("/onboarding");
  redirect("/onboarding?step=privacy");
}

export async function savePrivacy(formData: FormData) {
  const parsed = privacySchema.safeParse({
    visibility: formData.get("visibility"),
    shareOccupation: checked(formData, "share_occupation"),
    shareEducation: checked(formData, "share_education"),
    shareOriginRegion: checked(formData, "share_origin_region"),
  });

  if (!parsed.success) redirect("/onboarding?step=privacy&error=privacy");

  const { supabase } = await requireInvitedUser();
  const { error: joinError } = await supabase.rpc("join_my_connection_space", {
    p_space: "marriage",
  });

  if (joinError) redirect("/onboarding?step=privacy&error=invite");

  const { error: disclosureError } = await supabase.rpc("set_profile_disclosure_preferences", {
    p_share_occupation: parsed.data.shareOccupation,
    p_share_education: parsed.data.shareEducation,
    p_share_origin_region: parsed.data.shareOriginRegion,
  });

  if (disclosureError) redirect("/onboarding?step=privacy&error=profile");

  const { error: visibilityError } = await supabase.rpc("set_my_marriage_visibility", {
    p_visibility_mode: parsed.data.visibility,
  });

  if (visibilityError) redirect("/onboarding?step=privacy&error=save");

  revalidatePath("/onboarding");
  revalidatePath("/member");
  redirect("/member?ready=1");
}
