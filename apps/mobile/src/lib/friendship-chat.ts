import { supabase } from "@/lib/supabase";

export type FriendshipMessage = {
  messageId: string;
  senderIsMe: boolean;
  body: string;
  sentAt: string;
};

type FriendshipMessageRow = {
  message_id: string;
  sender_is_me: boolean;
  body: string;
  sent_at: string;
};

export function isFriendshipChatUnavailable(error: unknown) {
  const message = normalizeError(error);
  return (
    (message.includes("open_my_friendship_conversation") ||
      message.includes("list_my_friendship_messages") ||
      message.includes("send_friendship_message")) &&
    (message.includes("schema cache") ||
      message.includes("could not find the function") ||
      message.includes("does not exist"))
  );
}

export async function openFriendshipConversation(connectionId: string) {
  const { data, error } = await supabase.rpc("open_my_friendship_conversation", {
    p_connection_id: connectionId,
  });
  if (error) throw error;
  return data as string;
}

export async function listFriendshipMessages(connectionId: string): Promise<FriendshipMessage[]> {
  const { data, error } = await supabase.rpc("list_my_friendship_messages", {
    p_connection_id: connectionId,
    p_before_sent_at: null,
    p_before_message_id: null,
    p_limit: 50,
  });
  if (error) throw error;
  return ((data ?? []) as FriendshipMessageRow[]).map((row) => ({
    messageId: row.message_id,
    senderIsMe: row.sender_is_me,
    body: row.body,
    sentAt: row.sent_at,
  }));
}

export async function sendFriendshipMessage(connectionId: string, body: string, clientNonce: string) {
  const { data, error } = await supabase.rpc("send_friendship_message", {
    p_connection_id: connectionId,
    p_body: body,
    p_client_nonce: clientNonce,
  });
  if (error) throw error;
  return data as string;
}

export async function markFriendshipConversationRead(connectionId: string, through: string) {
  const { error } = await supabase.rpc("mark_my_friendship_conversation_read", {
    p_connection_id: connectionId,
    p_through: through,
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
