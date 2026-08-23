"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

const rawPhoneSchema = z.string().trim().min(8).max(30);
const idSchema = z.string().uuid();

function normalizePhone(value: string) {
  let phone = value.replace(/[\s()\-\.]/g, "");
  if (/^0\d{9}$/.test(phone)) phone = `+218${phone.slice(1)}`;
  else if (/^218\d{8,12}$/.test(phone)) phone = `+${phone}`;
  return phone;
}

export async function addFamilyShieldNumber(formData: FormData) {
  const parsed = rawPhoneSchema.safeParse(formData.get("phone"));
  if (!parsed.success) redirect("/family-shield?error=phone");

  const phone = normalizePhone(parsed.data);
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) redirect("/family-shield?error=phone");

  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/join");

  const { error } = await rpc.rpc("add_my_marriage_family_shield", {
    p_phone_e164: phone,
  });

  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("use another phone")) redirect("/family-shield?error=own");
    if (message.includes("limit")) redirect("/family-shield?error=limit");
    redirect("/family-shield?error=save");
  }

  revalidatePath("/family-shield");
  revalidatePath("/discovery");
  redirect("/family-shield?added=1");
}

export async function removeFamilyShieldNumber(formData: FormData) {
  const parsed = idSchema.safeParse(formData.get("exclusion_id"));
  if (!parsed.success) redirect("/family-shield?error=invalid");

  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/join");

  const { data, error } = await rpc.rpc("remove_my_marriage_family_shield", {
    p_exclusion_id: parsed.data,
  });

  if (error || data !== true) redirect("/family-shield?error=remove");

  revalidatePath("/family-shield");
  revalidatePath("/discovery");
  redirect("/family-shield?removed=1");
}
