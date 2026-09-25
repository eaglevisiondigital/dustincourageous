import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
export type FamilyActivity = Pick<Database["public"]["Tables"]["child_activity_events"]["Row"], "id" | "household_id" | "child_profile_id" | "title" | "description" | "created_at" | "xp_delta">;
export type ActivityCursor = Pick<FamilyActivity, "id" | "created_at">;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
function validCursor(row: ActivityCursor) {
  return Number.isSafeInteger(row.id) && row.id > 0 && timestamp.test(row.created_at) && Number.isFinite(Date.parse(row.created_at));
}
export async function readFamilyActivityPage(client: SupabaseClient<Database>, householdId: string, childIds: string[], cursor: ActivityCursor | null = null) {
  const ids = [...new Set(childIds)];
  if (!uuid.test(householdId) || ids.some(id => !uuid.test(id)) || (cursor && !validCursor(cursor))) throw new Error("Invalid activity request");
  if (!ids.length) return { items: [] as FamilyActivity[], next: null };
  let query = client.from("child_activity_events")
    .select("id,household_id,child_profile_id,title,description,created_at,xp_delta")
    .eq("household_id", householdId).in("child_profile_id", ids)
    .order("created_at", { ascending: false }).order("id", { ascending: false });
  if (cursor) query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  const { data, error } = await query.limit(21);
  if (error) throw error;
  if (!data || data.some(row => row.household_id !== householdId || !ids.includes(row.child_profile_id) || !validCursor(row) || typeof row.title !== "string" || (row.description !== null && typeof row.description !== "string") || (row.xp_delta !== null && !Number.isFinite(row.xp_delta)))) throw new Error("Activity could not be confirmed");
  const items = data.slice(0, 20);
  const last = items.at(-1);
  return { items, next: data.length > 20 && last ? { id: last.id, created_at: last.created_at } : null };
}
