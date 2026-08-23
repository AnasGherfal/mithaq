"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

const schema = z.object({
  photoId: z.string().uuid(),
  state: z.enum(["approved", "needs_changes", "rejected"]),
  reason: z.string().trim().max(80),
});

export async function moderatePhoto(formData: FormData) {
  const parsed = schema.safeParse({
    photoId: formData.get("photo_id"),
    state: formData.get("state"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) redirect("/admin/photos?error=invalid");
  if (parsed.data.state !== "approved" && parsed.data.reason.length < 2) {
    redirect("/admin/photos?error=reason");
  }

  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/join");

  const { data: access } = await supabase.rpc("get_my_moderation_access", {});
  if (!access?.some((item) => item.can_review)) redirect("/waitlist");

  const { error } = await rpc.rpc("moderate_photo_case", {
    p_photo_id: parsed.data.photoId,
    p_state: parsed.data.state,
    p_reason_code: parsed.data.reason || null,
    p_review_after: null,
  });

  if (error) redirect("/admin/photos?error=moderation");

  revalidatePath("/admin/photos");
  revalidatePath("/admin");
  redirect("/admin/photos?updated=1");
}
