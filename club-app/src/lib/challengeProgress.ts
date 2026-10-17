import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export async function saveChallengeCompletion(
  client: SupabaseClient<Database>,
  progressId: string,
  childId: string,
  expectedStatus: string,
  nextStatus: "pending_parent" | "completed"
) {
  const { data, error } = await client.from("child_challenge_progress")
    .update({ status: nextStatus, submitted_at: new Date().toISOString() })
    .eq("id", progressId)
    .eq("child_profile_id", childId)
    .eq("status", expectedStatus)
    .select("id,status")
    .single();
  if (error) throw error;
  if (!data || data.id !== progressId || data.status !== nextStatus) {
    throw new Error("Challenge progress could not be confirmed. Reload to check its current status.");
  }
  return data;
}
