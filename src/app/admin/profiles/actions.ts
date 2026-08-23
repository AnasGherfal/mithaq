"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

const schema = z.object({
  userId: z.string().uuid(),
  state: z.enum(["approved", "needs_changes", "rejected"]),
  reason: z.string().trim().max(120),
});

export async function moderateProfile(formData: FormData) {
  const parsed = schema.safeParse({
    userId: formData.get("user_id"),
    state: formData.get("state"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) redirect("/admin/profiles?error=invalid");
  if (parsed.data.state !== "approved" && parsed.data.reason.length < 2) {
    redirect("/admin/profiles?error=reason");
  }

  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/join");

  const { data: access } = await supabase.rpc("get_my_moderation_access", {});
  if (!access?.some((item) => item.can_review)) redirect("/waitlist");

  const { error } = await rpc.rpc("moderate_profile_case", {
    p_user_id: parsed.data.userId,
    p_state: parsed.data.state,
    p_reason_code: parsed.data.reason || null,
    p_review_after: null,
  });

  if (error) redirect("/admin/profiles?error=moderation");

  revalidatePath("/admin/profiles");
  revalidatePath("/admin");
  revalidatePath("/discovery");
  redirect("/admin/profiles?updated=1");
}
