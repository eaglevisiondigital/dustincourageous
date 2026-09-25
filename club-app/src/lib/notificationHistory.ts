import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type NotificationItem = Pick<Database["public"]["Tables"]["user_notifications"]["Row"],
  "id" | "user_id" | "title" | "body" | "status" | "created_at">;
export type NotificationCursor = Pick<NotificationItem, "id" | "created_at">;
const pageSize = 12;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

function validCursor(cursor: NotificationCursor) {
  return uuid.test(cursor.id) && timestamp.test(cursor.created_at) && Number.isFinite(Date.parse(cursor.created_at));
}

export async function readNotificationPage(client: SupabaseClient<Database>, userId: string, cursor: NotificationCursor | null = null) {
  if (!uuid.test(userId) || (cursor && !validCursor(cursor))) throw new Error("Notifications could not be requested.");
  let query = client.from("user_notifications")
    .select("id,user_id,title,body,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (cursor) {
    // Preserve database microseconds. Date.toISOString() would lose precision.
    query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  }
  const { data, error } = await query.limit(pageSize + 1);
  if (error) throw error;
  if (!data || data.some(row => row.user_id !== userId || !validCursor(row) ||
    typeof row.title !== "string" || typeof row.body !== "string" || typeof row.status !== "string")) {
    throw new Error("Notification history could not be confirmed.");
  }
  const items = data.slice(0, pageSize);
  const last = items.at(-1);
  return { items, next: data.length > pageSize && last ? { id: last.id, created_at: last.created_at } : null };
}
