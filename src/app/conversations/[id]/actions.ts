"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

const idSchema = z.string().uuid();
const messageSchema = z.string().trim().min(1).max(2000);
const nonceSchema = z.string().trim().regex(/^[A-Za-z0-9:_-]{16,100}$/);
const timestampSchema = z.string().datetime({ offset: true });
const reportCategorySchema = z.enum([
  "fake_identity",
  "harassment",
  "inappropriate_content",
  "fraud_or_money",
  "safety_concern",
  "other",
]);
const reportDetailsSchema = z.string().trim().max(1200);

async function getRpc() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/join");
  return asUntypedSupabase(supabase);
}

export async function sendConversationMessage(formData: FormData) {
  const introductionId = idSchema.safeParse(formData.get("introduction_id"));
  const body = messageSchema.safeParse(formData.get("body"));
  const nonce = nonceSchema.safeParse(formData.get("client_nonce"));

  if (!introductionId.success || !body.success || !nonce.success) {
    redirect("/introductions?error=invalid");
  }

  const rpc = await getRpc();
  const { error } = await rpc.rpc("send_conversation_message_idempotent", {
    p_introduction_id: introductionId.data,
    p_body: body.data,
    p_client_nonce: nonce.data,
  });

  if (error) redirect(`/conversations/${introductionId.data}?error=send`);

  revalidatePath("/member");
  revalidatePath("/introductions");
  revalidatePath(`/conversations/${introductionId.data}`);
  redirect(`/conversations/${introductionId.data}?sent=1`);
}

export async function markConversationRead(introductionId: string, through: string | null) {
  const parsedId = idSchema.safeParse(introductionId);
  const parsedThrough = through === null ? { success: true as const, data: null } : timestampSchema.safeParse(through);
  if (!parsedId.success || !parsedThrough.success) return;

  const rpc = await getRpc();
  await rpc.rpc("mark_my_conversation_read", {
    p_introduction_id: parsedId.data,
    p_through: parsedThrough.data,
  });
}

export async function endConversation(formData: FormData) {
  const introductionId = idSchema.safeParse(formData.get("introduction_id"));
  if (!introductionId.success) redirect("/introductions?error=invalid");

  const rpc = await getRpc();
  const { error } = await rpc.rpc("end_my_conversation", {
    p_introduction_id: introductionId.data,
  });

  if (error) redirect(`/conversations/${introductionId.data}?error=end`);

  revalidatePath("/member");
  revalidatePath("/introductions");
  revalidatePath(`/introductions/${introductionId.data}`);
  revalidatePath(`/conversations/${introductionId.data}`);
  redirect("/introductions?closed=1");
}

export async function reportConversation(formData: FormData) {
  const introductionId = idSchema.safeParse(formData.get("introduction_id"));
  const category = reportCategorySchema.safeParse(formData.get("category"));
  const details = reportDetailsSchema.safeParse(formData.get("details") ?? "");
  const blockTarget = formData.get("block_target") !== "no";

  if (!introductionId.success || !category.success || !details.success) {
    redirect("/introductions?error=invalid");
  }

  const rpc = await getRpc();
  const { error } = await rpc.rpc("submit_introduction_safety_report", {
    p_introduction_id: introductionId.data,
    p_category: category.data,
    p_details: details.data || null,
    p_block_target: blockTarget,
  });

  if (error) redirect(`/conversations/${introductionId.data}?error=report`);

  revalidatePath("/member");
  revalidatePath("/introductions");
  revalidatePath("/discovery");
  revalidatePath(`/conversations/${introductionId.data}`);
  redirect("/introductions?reported=1");
}
