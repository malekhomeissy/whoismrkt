import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type NotificationType =
  | "new_message"
  | "new_applicant"
  | "reviewing"
  | "contacted"
  | "shortlisted"
  | "accepted"
  | "rejected"
  | "match_recommendation"
  | "new_opportunity"
  | "saved_to_project"
  | "verified"
  | "contract_sent"
  | "deliverable_approved"
  | "revision_requested"
  | "pipeline_moved"
  | "weekly_ai_insight";

export type AppNotification = {
  id:         string;
  user_id:    string;
  type:       NotificationType | string;
  title:      string;
  body:       string | null;
  link:       string | null;
  read:       boolean;
  created_at: string;
};

export async function createNotification(params: {
  userId: string;
  type:   NotificationType | string;
  title:  string;
  body?:  string;
  link?:  string;
}): Promise<void> {
  await db.from("notifications").insert({
    user_id: params.userId,
    type:    params.type,
    title:   params.title,
    body:    params.body ?? null,
    link:    params.link ?? null,
    read:    false,
  });
}

export async function fetchNotifications(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<AppNotification[]> {
  const { data } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return (data ?? []) as AppNotification[];
}

export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const { count } = await db
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  return (count as number) ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await db.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
}
