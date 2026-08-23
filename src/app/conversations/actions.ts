"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

const idSchema = z.string().uuid();
const messageSchema = z.object({
  introductionId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
  nonce: z.string().min(16).max(100).regex(/^[A-Za-z0-9:_-]+$/),
});
const reportSchema = z.object({
  introductionId: z.string().uuid(),
  category: z.enum([
    "fake_identity",
    "harassment",
    "inappropriate_content",
    "fraud_or_money",
    "safety_concern",
    "other",
  ]),
  details: z.string().trim().max(1200),
});

async function getRpc() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/join");
  return asUntypedSupabase(supabase);
}

export async function sendConversationMessage(formData: FormData) {
  const parsed = messageSchema.safeParse({
    introductionId: formData.get("introduction_id"),
    body: formData.get("body"),
    nonce: formData.get("client_nonce"),
  });

  if (!parsed.success) redirect("/conversations?error=message");

  const rpc = await getRpc();
  const { error } = await rpc.rpc("send_conversation_message_idempotent", {
    p_introduction_id: parsed.data.introductionId,
    p_body: parsed.data.body,
    p_client_nonce: parsed.data.nonce,
  });

  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("rate limit")) {
      redirect(`/conversations/${parsed.data.introductionId}?error=rate`);
    }
    if (message.includes("conversation unavailable")) {
      redirect("/conversations?error=unavailable");
    }
    redirect(`/conversations/${parsed.data.introductionId}?error=send`);
  }

  revalidatePath(`/conversations/${parsed.data.introductionId}`);
  revalidatePath("/conversations");
  revalidatePath("/member");
  redirect(`/conversations/${parsed.data.introductionId}?sent=1`);
}

export async function endConversation(formData: FormData) {
  const parsed = idSchema.safeParse(formData.get("introduction_id"));
  if (!parsed.success) redirect("/conversations?error=invalid");

  const rpc = await getRpc();
  const { error } = await rpc.rpc("end_my_conversation", {
    p_introduction_id: parsed.data,
  });

  if (error) redirect(`/conversations/${parsed.data}?error=end`);

  revalidatePath("/conversations");
  revalidatePath("/introductions");
  revalidatePath("/member");
  redirect("/conversations?ended=1");
}

export async function reportConversation(formData: FormData) {
  const parsed = reportSchema.safeParse({
    introductionId: formData.get("introduction_id"),
    category: formData.get("category"),
    details: formData.get("details") ?? "",
  });

  if (!parsed.success) redirect("/conversations?error=report");

  const rpc = await getRpc();
  const { error } = await rpc.rpc("submit_introduction_safety_report", {
    p_introduction_id: parsed.data.introductionId,
    p_category: parsed.data.category,
    p_details: parsed.data.details || null,
    p_block_target: true,
  });

  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("recently submitted")) {
      redirect(`/conversations/${parsed.data.introductionId}?error=reported_recently`);
    }
    if (message.includes("rate limit")) {
      redirect(`/conversations/${parsed.data.introductionId}?error=report_rate`);
    }
    redirect(`/conversations/${parsed.data.introductionId}?error=report`);
  }

  await rpc.rpc("end_my_conversation", {
    p_introduction_id: parsed.data.introductionId,
  });

  revalidatePath("/conversations");
  revalidatePath("/introductions");
  revalidatePath("/discovery");
  revalidatePath("/member");
  redirect("/conversations?reported=1");
}
