import { supabase } from "@/lib/supabase";

export type ConnectionSpace = "marriage" | "friendship";
export type ConnectionSpaceMembershipState = "active" | "paused";

export type ConnectionSpaceState = {
  space: ConnectionSpace;
  membershipState: ConnectionSpaceMembershipState | null;
  isCurrent: boolean;
  profileCompleted: boolean;
};

type ConnectionSpaceRow = {
  space: ConnectionSpace;
  membership_state: ConnectionSpaceMembershipState | null;
  is_current: boolean;
  profile_completed: boolean;
};

export type FriendshipProfile = {
  displayName: string;
  aboutMe: string;
  city: string;
  interests: string[];
  profileCompletedAt: string | null;
};

type FriendshipProfileRow = {
  display_name: string | null;
  about_me: string | null;
  city: string | null;
  interests: string[] | null;
  profile_completed_at: string | null;
};

export function isConnectionSpaceFeatureUnavailable(error: unknown) {
  const value = normalizeError(error);
  const mentionsContract =
    value.includes("list_my_connection_spaces") ||
    value.includes("join_my_connection_space") ||
    value.includes("get_my_friendship_profile") ||
    value.includes("save_my_friendship_profile");

  return (
    mentionsContract &&
    (value.includes("schema cache") ||
      value.includes("could not find the function") ||
      value.includes("does not exist"))
  );
}

export async function listMyConnectionSpaces(): Promise<ConnectionSpaceState[]> {
  const { data, error } = await supabase.rpc("list_my_connection_spaces");
  if (error) throw error;

  return ((data ?? []) as ConnectionSpaceRow[]).map((row) => ({
    space: row.space,
    membershipState: row.membership_state,
    isCurrent: row.is_current,
    profileCompleted: row.profile_completed,
  }));
}

export async function joinMyConnectionSpace(space: ConnectionSpace) {
  const { error } = await supabase.rpc("join_my_connection_space", {
    p_space: space,
  });
  if (error) throw error;
}

export async function setMyCurrentConnectionSpace(space: ConnectionSpace) {
  const { error } = await supabase.rpc("set_my_current_connection_space", {
    p_space: space,
  });
  if (error) throw error;
}

export async function loadMyFriendshipProfile(): Promise<FriendshipProfile | null> {
  const { data, error } = await supabase.rpc("get_my_friendship_profile");
  if (error) throw error;

  const row = ((Array.isArray(data) ? data[0] : data) ?? null) as FriendshipProfileRow | null;
  if (!row) return null;

  return {
    displayName: row.display_name ?? "",
    aboutMe: row.about_me ?? "",
    city: row.city ?? "",
    interests: row.interests ?? [],
    profileCompletedAt: row.profile_completed_at,
  };
}

export async function saveMyFriendshipProfile(value: {
  displayName: string;
  aboutMe: string;
  city: string;
  interests: string[];
}) {
  const { data, error } = await supabase.rpc("save_my_friendship_profile", {
    p_display_name: value.displayName,
    p_about_me: value.aboutMe,
    p_city: value.city,
    p_interests: value.interests,
  });
  if (error) throw error;

  const row = ((Array.isArray(data) ? data[0] : data) ?? null) as {
    profile_completed?: boolean;
    profile_completed_at?: string | null;
  } | null;

  return {
    profileCompleted: Boolean(row?.profile_completed),
    profileCompletedAt: row?.profile_completed_at ?? null,
  };
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "").toLowerCase();
  }
  return String(error ?? "").toLowerCase();
}
