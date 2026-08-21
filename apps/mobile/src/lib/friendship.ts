import { supabase } from "@/lib/supabase";

export type FriendshipDiscoveryProfile = {
  userId: string;
  displayName: string;
  aboutMe: string;
  city: string;
  interests: string[];
  sharedInterests: string[];
  sharedInterestCount: number;
};

export type FriendshipRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "withdrawn"
  | "expired"
  | "blocked";
export type FriendshipRequestDirection = "incoming" | "outgoing";

export type FriendshipRequest = {
  requestId: string;
  direction: FriendshipRequestDirection;
  status: FriendshipRequestStatus;
  counterpartUserId: string;
  displayName: string;
  city: string;
  interests: string[];
  createdAt: string;
};

export type FriendshipConnection = {
  connectionId: string;
  counterpartUserId: string;
  displayName: string;
  city: string;
  interests: string[];
  connectedAt: string;
};

export type FriendshipChat = {
  connectionId: string;
  counterpartUserId: string;
  displayName: string;
  city: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type DiscoveryRow = {
  user_id: string;
  display_name: string;
  about_me: string;
  city: string;
  interests: string[] | null;
  shared_interests: string[] | null;
  shared_interest_count: number | string;
};

type RequestRow = {
  request_id: string;
  direction: FriendshipRequestDirection;
  status: FriendshipRequestStatus;
  counterpart_user_id: string;
  display_name: string;
  city: string;
  interests: string[] | null;
  created_at: string;
};

type ConnectionRow = {
  connection_id: string;
  counterpart_user_id: string;
  display_name: string;
  city: string;
  interests: string[] | null;
  connected_at: string;
};

type ChatRow = {
  connection_id: string;
  counterpart_user_id: string;
  display_name: string;
  city: string;
  last_message_body: string | null;
  last_message_at: string | null;
  unread_count: number | string;
};

export function isFriendshipDiscoveryUnavailable(error: unknown) {
  const message = normalizeError(error);
  return (
    (message.includes("list_friendship_discovery") ||
      message.includes("send_friendship_request") ||
      message.includes("list_my_friendship_requests") ||
      message.includes("list_my_friendship_connections") ||
      message.includes("list_my_friendship_chats")) &&
    (message.includes("schema cache") ||
      message.includes("could not find the function") ||
      message.includes("does not exist"))
  );
}

export async function listFriendshipDiscovery(limit = 6): Promise<FriendshipDiscoveryProfile[]> {
  const { data, error } = await supabase.rpc("list_friendship_discovery", { p_limit: limit });
  if (error) throw error;
  return ((data ?? []) as DiscoveryRow[]).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    aboutMe: row.about_me,
    city: row.city,
    interests: row.interests ?? [],
    sharedInterests: row.shared_interests ?? [],
    sharedInterestCount: Number(row.shared_interest_count ?? 0),
  }));
}

export async function sendFriendshipRequest(recipientUserId: string) {
  const { data, error } = await supabase.rpc("send_friendship_request", { p_recipient_user_id: recipientUserId });
  if (error) throw error;
  if (typeof data !== "string") throw new Error("friendship request unavailable");
  return data;
}

export async function listMyFriendshipRequests(): Promise<FriendshipRequest[]> {
  const { data, error } = await supabase.rpc("list_my_friendship_requests");
  if (error) throw error;
  return ((data ?? []) as RequestRow[]).map((row) => ({
    requestId: row.request_id,
    direction: row.direction,
    status: row.status,
    counterpartUserId: row.counterpart_user_id,
    displayName: row.display_name,
    city: row.city,
    interests: row.interests ?? [],
    createdAt: row.created_at,
  }));
}

export async function listMyFriendshipConnections(): Promise<FriendshipConnection[]> {
  const { data, error } = await supabase.rpc("list_my_friendship_connections");
  if (error) throw error;
  return ((data ?? []) as ConnectionRow[]).map((row) => ({
    connectionId: row.connection_id,
    counterpartUserId: row.counterpart_user_id,
    displayName: row.display_name,
    city: row.city,
    interests: row.interests ?? [],
    connectedAt: row.connected_at,
  }));
}

export async function listMyFriendshipChats(): Promise<FriendshipChat[]> {
  const { data, error } = await supabase.rpc("list_my_friendship_chats");
  if (error) throw error;
  return ((data ?? []) as ChatRow[]).map((row) => ({
    connectionId: row.connection_id,
    counterpartUserId: row.counterpart_user_id,
    displayName: row.display_name,
    city: row.city,
    lastMessageBody: row.last_message_body,
    lastMessageAt: row.last_message_at,
    unreadCount: Number(row.unread_count ?? 0),
  }));
}

export async function respondToFriendshipRequest(requestId: string, accept: boolean) {
  const { data, error } = await supabase.rpc("respond_to_friendship_request", { p_request_id: requestId, p_accept: accept });
  if (error) throw error;
  return data as FriendshipRequestStatus;
}

export async function withdrawFriendshipRequest(requestId: string) {
  const { error } = await supabase.rpc("withdraw_friendship_request", { p_request_id: requestId });
  if (error) throw error;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "").toLowerCase();
  }
  return String(error ?? "").toLowerCase();
}
