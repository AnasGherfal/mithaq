import { supabase } from "@/lib/supabase";

export type MarriageDiscoveryPhotoMode = "full" | "blurred" | "hidden";
export type MarriageDiscoveryAlignmentReason =
  | "same_city"
  | "living_arrangement"
  | "children_plan"
  | "work_after_marriage"
  | "wedding_style";

export type MarriageDiscoveryProfile = {
  userId: string;
  displayName: string;
  aboutMe: string;
  occupation: string;
  education: string;
  city: string;
  originRegion: string;
  ageBandId: number;
  ageBandLabel: string;
  maritalStatus: string;
  hasChildren: boolean;
  photoId: string | null;
  photoDisplayMode: MarriageDiscoveryPhotoMode;
  alignmentReasons: MarriageDiscoveryAlignmentReason[];
  alignmentCount: number;
};

export type MarriageDiscoveryPhoto = {
  photoId: string;
  displayMode: "full" | "blurred";
  uri: string;
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
  age_band_label: string | null;
  marital_status: string;
  has_children: boolean | null;
  photo_id: string | null;
  photo_display_mode: string | null;
  alignment_reasons: string[] | null;
  alignment_count: number | string | null;
};

type DiscoveryPhotoResponse = {
  photoId?: unknown;
  displayMode?: unknown;
  signedUrl?: unknown;
  imageDataUrl?: unknown;
};

const alignmentReasonValues: MarriageDiscoveryAlignmentReason[] = [
  "same_city",
  "living_arrangement",
  "children_plan",
  "work_after_marriage",
  "wedding_style",
];

export function isMarriageDiscoveryUnavailable(error: unknown) {
  const message = normalizeError(error);
  return (
    (message.includes("list_marriage_discovery") ||
      message.includes("record_marriage_discovery_action") ||
      message.includes("hide_marriage_discovery_member")) &&
    (message.includes("schema cache") ||
      message.includes("could not find the function") ||
      message.includes("does not exist"))
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
    ageBandLabel: row.age_band_label ?? "",
    maritalStatus: row.marital_status,
    hasChildren: Boolean(row.has_children),
    photoId: row.photo_id,
    photoDisplayMode: normalizePhotoMode(row.photo_display_mode),
    alignmentReasons: (row.alignment_reasons ?? []).filter(
      (value): value is MarriageDiscoveryAlignmentReason =>
        alignmentReasonValues.includes(value as MarriageDiscoveryAlignmentReason),
    ),
    alignmentCount: Number(row.alignment_count ?? 0),
  }));
}

export async function getMarriageDiscoveryPhoto(
  candidateUserId: string,
  photoId: string,
): Promise<MarriageDiscoveryPhoto | null> {
  const { data, error } = await supabase.functions.invoke(
    "marriage-discovery-photo-url",
    {
      body: { candidateUserId, photoId },
    },
  );
  if (error) return null;

  const response = (data ?? {}) as DiscoveryPhotoResponse;
  const displayMode = response.displayMode === "full" || response.displayMode === "blurred"
    ? response.displayMode
    : null;
  const uri = typeof response.signedUrl === "string"
    ? response.signedUrl
    : typeof response.imageDataUrl === "string"
      ? response.imageDataUrl
      : null;

  if (!displayMode || !uri) return null;

  return {
    photoId: typeof response.photoId === "string" ? response.photoId : photoId,
    displayMode,
    uri,
  };
}

export async function recordMarriageDiscoveryAction(
  candidateUserId: string,
  action: "noticed" | "skipped",
) {
  const { error } = await supabase.rpc("record_marriage_discovery_action", {
    p_candidate_user_id: candidateUserId,
    p_action: action,
  });
  if (error) throw error;
}

export async function hideMarriageDiscoveryMember(candidateUserId: string) {
  const { error } = await supabase.rpc("hide_marriage_discovery_member", {
    p_target_user_id: candidateUserId,
  });
  if (error) throw error;
}

function normalizePhotoMode(value: string | null): MarriageDiscoveryPhotoMode {
  if (value === "full" || value === "blurred") return value;
  return "hidden";
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "").toLowerCase();
  }
  return String(error ?? "").toLowerCase();
}
