import { supabase } from "@/lib/supabase";

export type LivingArrangement =
  | "independent_home"
  | "with_family_initially"
  | "with_family_long_term"
  | "flexible";

export type ChildrenPlan = "want_children" | "do_not_want_children" | "unsure";

export type WorkAfterMarriage =
  | "both_work"
  | "one_may_pause"
  | "open_to_discuss"
  | "no_preference";

export type WeddingStyle = "simple" | "moderate" | "large" | "discuss_together";

export type MarriagePriorities = {
  livingArrangement: LivingArrangement;
  childrenPlan: ChildrenPlan;
  workAfterMarriage: WorkAfterMarriage;
  weddingStyle: WeddingStyle;
  completedAt: string | null;
};

type PrioritiesRow = {
  living_arrangement: LivingArrangement;
  children_plan: ChildrenPlan;
  work_after_marriage: WorkAfterMarriage;
  wedding_style: WeddingStyle;
  completed_at: string | null;
};

export const defaultMarriagePriorities: MarriagePriorities = {
  livingArrangement: "flexible",
  childrenPlan: "unsure",
  workAfterMarriage: "open_to_discuss",
  weddingStyle: "discuss_together",
  completedAt: null,
};

export function isMarriagePrioritiesUnavailable(error: unknown) {
  const message = normalizeError(error);
  return (
    (message.includes("get_my_marriage_practical_priorities") ||
      message.includes("save_my_marriage_practical_priorities")) &&
    (message.includes("schema cache") ||
      message.includes("could not find the function") ||
      message.includes("does not exist"))
  );
}

export async function loadMarriagePriorities(): Promise<MarriagePriorities | null> {
  const { data, error } = await supabase.rpc("get_my_marriage_practical_priorities");
  if (error) throw error;

  const row = ((Array.isArray(data) ? data[0] : data) ?? null) as PrioritiesRow | null;
  if (!row) return null;

  return {
    livingArrangement: row.living_arrangement,
    childrenPlan: row.children_plan,
    workAfterMarriage: row.work_after_marriage,
    weddingStyle: row.wedding_style,
    completedAt: row.completed_at,
  };
}

export async function saveMarriagePriorities(
  value: Omit<MarriagePriorities, "completedAt">,
): Promise<MarriagePriorities> {
  const { data, error } = await supabase.rpc("save_my_marriage_practical_priorities", {
    p_living_arrangement: value.livingArrangement,
    p_children_plan: value.childrenPlan,
    p_work_after_marriage: value.workAfterMarriage,
    p_wedding_style: value.weddingStyle,
  });
  if (error) throw error;

  const row = ((Array.isArray(data) ? data[0] : data) ?? null) as PrioritiesRow | null;
  if (!row) throw new Error("marriage priorities unavailable");

  return {
    livingArrangement: row.living_arrangement,
    childrenPlan: row.children_plan,
    workAfterMarriage: row.work_after_marriage,
    weddingStyle: row.wedding_style,
    completedAt: row.completed_at,
  };
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "").toLowerCase();
  }
  return String(error ?? "").toLowerCase();
}
