"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ModerationKind = "profile" | "photo" | "report";
type ModerationAccessRow = {
  moderation_role: string;
  can_review: boolean;
  can_enforce: boolean;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const kindSet = new Set<ModerationKind>(["profile", "photo", "report"]);
const profileIntents = {
  approve: "approved",
  changes: "needs_changes",
  reject: "rejected",
} as const;
const photoIntents = {
  approve: "approved",
  changes: "needs_changes",
  reject: "rejected",
} as const;
const reportIntents = new Set([
  "triaged",
  "investigating",
  "actioned",
  "dismissed",
  "closed",
] as const);
const enforcementIntents = new Set(["restrict", "suspend", "ban", "restore"] as const);

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

function isUuid(valueToCheck: string) {
  return uuidPattern.test(valueToCheck);
}

function safeReason(formData: FormData) {
  const reason = value(formData, "reasonCode");
  if (!reason) return null;
  if (reason.length > 80 || !/^[A-Za-z0-9._:-]+$/.test(reason)) return undefined;
  return reason;
}

function safeReviewAfter(formData: FormData) {
  const raw = value(formData, "reviewAfter");
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function selectedRoute(kind: string, itemId: string, notice: string) {
  const params = new URLSearchParams();
  if (kindSet.has(kind as ModerationKind) && isUuid(itemId)) {
    params.set("kind", kind);
    params.set("id", itemId);
  }
  params.set("notice", notice);
  return `/moderation?${params.toString()}`;
}

async function requireModerationAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/moderation/login");

  const { data, error } = await supabase.rpc("get_my_moderation_access");
  const first = Array.isArray(data) ? data[0] : null;
  if (error || !first || typeof first !== "object") redirect("/moderation/login");

  const row = first as ModerationAccessRow;
  if (
    typeof row.moderation_role !== "string" ||
    typeof row.can_review !== "boolean" ||
    typeof row.can_enforce !== "boolean" ||
    !row.can_review
  ) {
    redirect("/moderation/login");
  }

  return { supabase, access: row };
}

export async function moderateCaseAction(formData: FormData) {
  const kind = value(formData, "kind");
  const itemId = value(formData, "itemId");
  const targetUserId = value(formData, "targetUserId");
  const intent = value(formData, "intent");
  const reasonCode = safeReason(formData);
  const reviewAfter = safeReviewAfter(formData);

  if (
    !kindSet.has(kind as ModerationKind) ||
    !isUuid(itemId) ||
    !isUuid(targetUserId) ||
    reasonCode === undefined ||
    reviewAfter === undefined
  ) {
    redirect(selectedRoute(kind, itemId, "invalid_input"));
  }

  const { supabase, access } = await requireModerationAccess();
  let error: { message?: string } | null = null;

  if (kind === "profile" && intent in profileIntents) {
    const state = profileIntents[intent as keyof typeof profileIntents];
    const result = await supabase.rpc("moderate_profile_case", {
      p_user_id: targetUserId,
      p_state: state,
      p_reason_code: reasonCode,
      p_review_after: reviewAfter,
    });
    error = result.error;
  } else if (kind === "photo" && intent in photoIntents) {
    const state = photoIntents[intent as keyof typeof photoIntents];
    const result = await supabase.rpc("moderate_photo_case", {
      p_photo_id: itemId,
      p_state: state,
      p_reason_code: reasonCode,
      p_review_after: reviewAfter,
    });
    error = result.error;
  } else if (kind === "report" && reportIntents.has(intent as never)) {
    if (!access.can_enforce) redirect(selectedRoute(kind, itemId, "forbidden"));
    const result = await supabase.rpc("moderate_report_case", {
      p_report_id: itemId,
      p_to_status: intent,
      p_reason_code: reasonCode,
    });
    error = result.error;
  } else {
    redirect(selectedRoute(kind, itemId, "invalid_action"));
  }

  if (error) redirect(selectedRoute(kind, itemId, "action_failed"));

  revalidatePath("/moderation");
  redirect(selectedRoute(kind, itemId, "saved"));
}

export async function enforceMemberAction(formData: FormData) {
  const kind = value(formData, "kind");
  const itemId = value(formData, "itemId");
  const targetUserId = value(formData, "targetUserId");
  const intent = value(formData, "intent");
  const reasonCode = safeReason(formData);
  const reviewAfter = safeReviewAfter(formData);

  if (
    !kindSet.has(kind as ModerationKind) ||
    !isUuid(itemId) ||
    !isUuid(targetUserId) ||
    !enforcementIntents.has(intent as never) ||
    reasonCode === undefined ||
    reviewAfter === undefined ||
    (intent !== "restore" && !reasonCode)
  ) {
    redirect(selectedRoute(kind, itemId, "invalid_input"));
  }

  const { supabase, access } = await requireModerationAccess();
  if (!access.can_enforce) redirect(selectedRoute(kind, itemId, "forbidden"));

  const { error } = await supabase.rpc("moderate_member_enforcement", {
    p_user_id: targetUserId,
    p_action: intent,
    p_reason_code: reasonCode,
    p_review_after: reviewAfter,
  });

  if (error) redirect(selectedRoute(kind, itemId, "action_failed"));

  revalidatePath("/moderation");
  redirect(selectedRoute(kind, itemId, "saved"));
}

export async function moderationSignOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/moderation/login");
}
