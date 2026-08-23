"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

const candidateSchema = z.string().uuid();

type DiscoveryActionResult = {
  action_id: string;
  introduction_id: string | null;
  mutual_interest: boolean;
};

async function getAuthenticatedRpc() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/join");
  return { supabase, rpc: asUntypedSupabase(supabase) };
}

export async function noticeCandidate(formData: FormData) {
  const parsed = candidateSchema.safeParse(formData.get("candidate_id"));
  if (!parsed.success) redirect("/discovery?error=invalid");

  const { rpc } = await getAuthenticatedRpc();
  const { data, error } = await rpc.rpc("record_marriage_discovery_action_v2", {
    p_candidate_user_id: parsed.data,
    p_action: "noticed",
  });

  if (error) redirect("/discovery?error=unavailable");

  const result = Array.isArray(data) ? (data[0] as DiscoveryActionResult | undefined) : undefined;
  revalidatePath("/discovery");
  revalidatePath("/introductions");

  if (result?.mutual_interest && result.introduction_id) {
    redirect(`/introductions/${result.introduction_id}?new=1`);
  }

  redirect("/discovery?noticed=1");
}

export async function skipCandidate(formData: FormData) {
  const parsed = candidateSchema.safeParse(formData.get("candidate_id"));
  if (!parsed.success) redirect("/discovery?error=invalid");

  const { rpc } = await getAuthenticatedRpc();
  const { error } = await rpc.rpc("record_marriage_discovery_action", {
    p_candidate_user_id: parsed.data,
    p_action: "skipped",
  });

  if (error) redirect("/discovery?error=unavailable");
  revalidatePath("/discovery");
  redirect("/discovery?skipped=1");
}

export async function hideCandidate(formData: FormData) {
  const parsed = candidateSchema.safeParse(formData.get("candidate_id"));
  if (!parsed.success) redirect("/discovery?error=invalid");

  const { rpc } = await getAuthenticatedRpc();
  const { error } = await rpc.rpc("hide_marriage_discovery_member", {
    p_target_user_id: parsed.data,
  });

  if (error) redirect("/discovery?error=unavailable");
  revalidatePath("/discovery");
  redirect("/discovery?hidden=1");
}
