"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

const idSchema = z.string().uuid();
const decisionSchema = z.enum(["accept", "decline"]);

async function getRpc() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/join");
  return asUntypedSupabase(supabase);
}

export async function respondToIntroduction(formData: FormData) {
  const introId = idSchema.safeParse(formData.get("introduction_id"));
  const decision = decisionSchema.safeParse(formData.get("decision"));
  if (!introId.success || !decision.success) redirect("/introductions?error=invalid");

  const rpc = await getRpc();
  const { data, error } = await rpc.rpc("respond_to_introduction", {
    p_introduction_id: introId.data,
    p_accept: decision.data === "accept",
  });

  if (error) redirect(`/introductions/${introId.data}?error=response`);

  revalidatePath("/introductions");
  revalidatePath(`/introductions/${introId.data}`);

  if (data === "mutually_accepted") redirect(`/introductions/${introId.data}?mutual=1`);
  if (data === "declined") redirect("/introductions?declined=1");
  if (data === "expired") redirect("/introductions?expired=1");
  if (data === "cancelled") redirect("/introductions?cancelled=1");

  redirect(`/introductions/${introId.data}?accepted=1`);
}

export async function revealIntroductionPhoto(formData: FormData) {
  const parsed = idSchema.safeParse(formData.get("introduction_id"));
  if (!parsed.success) redirect("/introductions?error=invalid");

  const rpc = await getRpc();
  const { error } = await rpc.rpc("reveal_my_introduction_photo", {
    p_introduction_id: parsed.data,
  });

  if (error) redirect(`/introductions/${parsed.data}?error=reveal`);

  revalidatePath(`/introductions/${parsed.data}`);
  redirect(`/introductions/${parsed.data}?revealed=1`);
}

export async function hideRecognizedIntroduction(formData: FormData) {
  const parsed = idSchema.safeParse(formData.get("introduction_id"));
  if (!parsed.success) redirect("/introductions?error=invalid");

  const rpc = await getRpc();
  const { error } = await rpc.rpc("hide_recognized_introduction_member", {
    p_introduction_id: parsed.data,
  });

  if (error) redirect(`/introductions/${parsed.data}?error=hide`);

  revalidatePath("/introductions");
  revalidatePath("/discovery");
  redirect("/introductions?hidden=1");
}

export async function blockIntroductionMember(formData: FormData) {
  const parsed = idSchema.safeParse(formData.get("introduction_id"));
  if (!parsed.success) redirect("/introductions?error=invalid");

  const rpc = await getRpc();
  const { error } = await rpc.rpc("block_introduction_member", {
    p_introduction_id: parsed.data,
  });

  if (error) redirect(`/introductions/${parsed.data}?error=block`);

  revalidatePath("/introductions");
  revalidatePath("/discovery");
  redirect("/introductions?blocked=1");
}
