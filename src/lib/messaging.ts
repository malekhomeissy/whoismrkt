import { supabase } from "@/integrations/supabase/client";

/**
 * Finds an existing 1:1 conversation between the current user and `otherUserId`,
 * or creates a new one. Returns the conversation ID.
 *
 * Pass `campaignId` to associate the conversation with a specific campaign.
 * The same two users can have multiple conversations if campaign context differs.
 */
export async function findOrCreateConversation(
  otherUserId: string,
  campaignId?: string | null,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("find_or_create_conversation", {
    p_other_user_id: otherUserId,
    p_campaign_id:   campaignId ?? undefined,
  });

  if (error) {
    console.error("[messaging] find_or_create_conversation:", error);
    throw new Error(error.message ?? "Failed to start conversation");
  }

  return data as string;
}

/** Mark all messages in a conversation as read for the current user. */
export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabase
    .from("conversation_participants")
    .update({
      last_read_at:  new Date().toISOString(),
      unread_count:  0,
    })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

/** Returns total unread message count for the current user across all conversations. */
export async function fetchUnreadCount(userId: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await supabase
    .from("conversation_participants")
    .select("unread_count")
    .eq("user_id", userId)
    .gt("unread_count", 0);

  if (!data) return 0;
  return (data as Array<{ unread_count: number }>).reduce(
    (sum, row) => sum + (row.unread_count ?? 0),
    0,
  );
}
