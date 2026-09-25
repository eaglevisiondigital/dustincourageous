import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

type PreferenceRow = Database["public"]["Tables"]["notification_preferences"]["Row"];
export type Preferences = Pick<PreferenceRow, "email_enabled" | "push_enabled" | "product_updates" | "child_progress" | "rewards" | "family_reminders" | "marketing" | "quiet_hours_start" | "quiet_hours_end" | "timezone">;

export function validatePreferences(preferences: Preferences) {
  const { quiet_hours_start: start, quiet_hours_end: end } = preferences;
  if (!!start !== !!end) throw new Error("Set both quiet-hour times, or clear both to turn quiet hours off.");
  for (const value of [start,end]) {
    if (value && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)) throw new Error("Enter valid quiet-hour times.");
  }
  if (start && end && start.slice(0,5) === end.slice(0,5)) throw new Error("Quiet hours must have different start and end times.");
  try { new Intl.DateTimeFormat("en-US", { timeZone: preferences.timezone }).format(); }
  catch { throw new Error("Enter a valid timezone, such as America/Chicago."); }
  if (!preferences.timezone.trim()) throw new Error("Enter a notification timezone.");
}

export async function saveNotificationPreferences(client: SupabaseClient<Database>, userId: string, preferences: Preferences) {
  validatePreferences(preferences);
  const { data, error } = await client.from("notification_preferences")
    .upsert({ ...preferences, user_id: userId }, { onConflict: "user_id" })
    .select("user_id,email_enabled,push_enabled,product_updates,child_progress,rewards,family_reminders,marketing,quiet_hours_start,quiet_hours_end,timezone").single();
  if (error) throw error;
  if (!data || data.user_id !== userId) throw new Error("Saved preferences could not be confirmed.");
  return data;
}

export async function completeFamilyFaith(client: SupabaseClient<Database>, householdId: string, guideId: string, childId: string | null, userId: string) {
  const { error } = await client.from("household_faith_sessions").upsert({
    household_id: householdId, family_faith_guide_id: guideId, child_profile_id: childId,
    completed_by: userId, completed_at: new Date().toISOString()
  }, { onConflict: "household_id,family_faith_guide_id,child_profile_id", ignoreDuplicates: true });
  if (error) throw error;
  let query = client.from("household_faith_sessions").select("id,completed_at")
    .eq("household_id", householdId).eq("family_faith_guide_id", guideId);
  query = childId === null ? query.is("child_profile_id", null) : query.eq("child_profile_id", childId);
  const result = await query.single();
  if (result.error) throw result.error;
  if (!result.data?.completed_at) throw new Error("Family Faith completion could not be confirmed.");
  return result.data;
}

export async function markNotificationRead(client: SupabaseClient<Database>, userId: string, id: string) {
  const { data, error } = await client.from("user_notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", userId).select("id,status").single();
  if (error) throw error;
  if (data?.id !== id || data.status !== "read") throw new Error("Read status could not be confirmed.");
}

export async function markLoadedNotificationsRead(client: SupabaseClient<Database>, userId: string,
  items: { id: string; user_id: string; status: string }[]) {
  if (items.some(item => item.user_id !== userId)) throw new Error("Notification owner could not be confirmed.");
  const ids = [...new Set(items.filter(item => item.status === "unread").map(item => item.id))];
  if (!ids.length) return { confirmed: [] as string[], unconfirmed: [] as string[] };
  const {data,error} = await client.from("user_notifications")
    .update({status:"read",read_at:new Date().toISOString()})
    .eq("user_id",userId).eq("status","unread").in("id",ids).select("id,user_id,status");
  if (error) throw error;
  const rows = data ?? [];
  if (rows.some(row => !ids.includes(row.id) || row.user_id !== userId || row.status !== "read") || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error("Notification updates could not be confirmed.");
  const confirmed = rows.map(row => row.id);
  return {confirmed,unconfirmed:ids.filter(id => !confirmed.includes(id))};
}
