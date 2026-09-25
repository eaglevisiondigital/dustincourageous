import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
export type ParticipantResult = { child_profile_id: string; status: string };
export async function saveFamilyParticipation(
  client: SupabaseClient<Database>, householdId: string, activityId: string,
  children: string[], kind: "faith" | "challenge", action: "participate" | "complete" = "complete", steps: string[] = []
): Promise<ParticipantResult[]> {
  const ids = [...new Set(children)];
  if (!ids.length || ids.some(id => !id)) throw new Error("Choose participating children.");
  const result = kind === "faith"
    ? await client.rpc("complete_family_faith_participants", { p_household_id: householdId, p_guide_id: activityId, p_child_ids: ids })
    : await client.rpc("save_family_challenge_participants", { p_household_id: householdId, p_challenge_id: activityId, p_child_ids: ids, p_action: action, p_step_ids: [...new Set(steps)] });
  if (result.error) throw result.error;
  const rows = result.data;
  const statuses = kind === "faith" ? ["completed"] : action === "complete" ? ["completed", "pending_parent"] : ["in_progress", "completed", "pending_parent"];
  if (!rows || rows.length !== ids.length || new Set(rows.map(row => row.child_profile_id)).size !== ids.length || rows.some(row => !ids.includes(row.child_profile_id) || !statuses.includes(row.status))) {
    throw new Error("Participation could not be confirmed for every selected child.");
  }
  return rows;
}
