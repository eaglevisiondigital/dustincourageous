import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export async function readLeaderGroup(client: SupabaseClient<Database>, groupId: string) {
  if (!groupId) throw new Error("Choose a group.");
  const [assignments, roster] = await Promise.all([
    client.from("group_challenge_assignments")
      .select("id,challenge_id,due_at,challenges(id,title,challenge_type,xp_reward)")
      .eq("group_id", groupId).order("assigned_at", { ascending: false }),
    client.rpc("get_group_roster", { p_group_id: groupId })
  ]);
  if (assignments.error) throw assignments.error;
  if (roster.error) throw roster.error;
  if (!assignments.data || !roster.data) throw new Error("Group details could not be confirmed.");
  const entries = await Promise.all(assignments.data.map(async assignment => {
    const { data, error } = await client.rpc("get_group_progress_summary", {
      p_group_id: groupId, p_challenge_id: assignment.challenge_id
    });
    if (error) throw error;
    const summary = data?.[0];
    if (!summary) throw new Error("Group progress could not be confirmed.");
    return [assignment.challenge_id, summary] as const;
  }));
  return { assignments: assignments.data, roster: roster.data, progress: Object.fromEntries(entries) };
}
