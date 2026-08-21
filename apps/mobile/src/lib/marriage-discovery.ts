import { supabase } from "@/lib/supabase";

export type MarriageDiscoveryProfile = {
  userId: string;
  displayName: string;
  aboutMe: string;
  occupation: string;
  education: string;
  city: string;
  originRegion: string;
  ageBandId: number;
  maritalStatus: string;
  hasChildren: boolean;
};

type DiscoveryRow = {
  user_id: string;
  display_name: string | null;
  about_me: string | null;
  occupation: string | null;
  education: string | null;
  city: string | null;
  origin_region: string | null;
  age_band_id: number;
  marital_status: string;
  has_children: boolean | null;
};

export function isMarriageDiscoveryUnavailable(error: unknown) {
  const message = normalizeError(error);
  return (
    (message.includes("list_marriage_discovery") || message.includes("record_marriage_discovery_action")) &&
    (message.includes("schema cache") || message.includes("could not find the function") || message.includes("does not exist"))
  );
}

export async function listMarriageDiscovery(limit = 6): Promise<MarriageDiscoveryProfile[]> {
  const { data, error } = await supabase.rpc("list_marriage_discovery", { p_limit: limit });
  if (error) throw error;

  return ((data ?? []) as DiscoveryRow[]).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name ?? "",
    aboutMe: row.about_me ?? "",
    occupation: row.occupation ?? "",
    education: row.education ?? "",
    city: row.city ?? "",
    originRegion: row.origin_region ?? "",
    ageBandId: Number(row.age_band_id),
    maritalStatus: row.marital_status,
    hasChildren: Boolean(row.has_children),
  }));
}

export async function recordMarriageDiscoveryAction(candidateUserId: string, action: "noticed" | "skipped") {
  const { error } = await supabase.rpc("record_marriage_discovery_action", {
    p_candidate_user_id: candidateUserId,
    p_action: action,
  });
  if (error) throw error;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "").toLowerCase();
  }
  return String(error ?? "").toLowerCase();
}
