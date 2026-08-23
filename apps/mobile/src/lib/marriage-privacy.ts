import { supabase } from "@/lib/supabase";

export type MarriageVisibilityMode = "standard" | "private";

export type IdentityTrustSummary = {
  phoneVerified: boolean;
  approvedPhoto: boolean;
  realPersonVerified: boolean;
  age18PlusVerified: boolean;
  identityVerified: boolean;
};

type IdentityTrustRow = {
  phone_verified: boolean | null;
  approved_photo: boolean | null;
  real_person_verified: boolean | null;
  age_18_plus_verified: boolean | null;
  identity_verified: boolean | null;
};

export async function getMyMarriageVisibility(): Promise<MarriageVisibilityMode> {
  const { data, error } = await supabase.rpc("get_my_marriage_visibility");
  if (error) throw error;
  return data === "standard" ? "standard" : "private";
}

export async function setMyMarriageVisibility(visibilityMode: MarriageVisibilityMode): Promise<MarriageVisibilityMode> {
  const { data, error } = await supabase.rpc("set_my_marriage_visibility", {
    p_visibility_mode: visibilityMode,
  });
  if (error) throw error;
  return data === "standard" ? "standard" : "private";
}

export async function getMyIdentityTrustSummary(): Promise<IdentityTrustSummary> {
  const { data, error } = await supabase.rpc("get_my_identity_trust_summary");
  if (error) throw error;

  const row = ((Array.isArray(data) ? data[0] : data) ?? null) as IdentityTrustRow | null;
  return {
    phoneVerified: Boolean(row?.phone_verified),
    approvedPhoto: Boolean(row?.approved_photo),
    realPersonVerified: Boolean(row?.real_person_verified),
    age18PlusVerified: Boolean(row?.age_18_plus_verified),
    identityVerified: Boolean(row?.identity_verified),
  };
}

export function isMarriagePrivacyUnavailable(error: unknown) {
  const message = normalizeError(error);
  return (
    (message.includes("get_my_marriage_visibility") ||
      message.includes("set_my_marriage_visibility") ||
      message.includes("get_my_identity_trust_summary")) &&
    (message.includes("schema cache") ||
      message.includes("could not find the function") ||
      message.includes("does not exist"))
  );
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "").toLowerCase();
  }
  return String(error ?? "").toLowerCase();
}
