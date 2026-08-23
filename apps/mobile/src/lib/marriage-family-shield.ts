import { supabase } from "@/lib/supabase";

export type MarriageFamilyShieldEntry = {
  exclusionId: string;
  maskedPhone: string;
  createdAt: string;
};

type ShieldRow = {
  exclusion_id: string;
  masked_phone: string;
  created_at: string;
};

export async function listMarriageFamilyShield(): Promise<MarriageFamilyShieldEntry[]> {
  const { data, error } = await supabase.rpc("list_my_marriage_family_shield");
  if (error) throw error;

  return ((data ?? []) as ShieldRow[]).map((row) => ({
    exclusionId: row.exclusion_id,
    maskedPhone: row.masked_phone,
    createdAt: row.created_at,
  }));
}

export async function addMarriageFamilyShield(phoneE164: string) {
  const { data, error } = await supabase.rpc("add_my_marriage_family_shield", {
    p_phone_e164: phoneE164,
  });
  if (error) throw error;
  return typeof data === "string" ? data : null;
}

export async function removeMarriageFamilyShield(exclusionId: string) {
  const { error } = await supabase.rpc("remove_my_marriage_family_shield", {
    p_exclusion_id: exclusionId,
  });
  if (error) throw error;
}
