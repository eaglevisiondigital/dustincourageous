import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
export type FamilyChallenge = { id: string; title: string; description: string | null; xp_reward: number; parent_approval_required: boolean };
export type FamilyChallengeStep = { id: string; title: string; instructions: string | null; is_required: boolean };

export async function readFamilyChallenge(client: SupabaseClient<Database>, challengeId: string, childIds: string[]) {
  const ids = [...new Set(childIds)];
  const [challenge, steps, progress] = await Promise.all([
    client.from("challenges").select("id,title,description,xp_reward,parent_approval_required").eq("id", challengeId).eq("status", "published").single(),
    client.from("challenge_steps").select("id,title,instructions,is_required").eq("challenge_id", challengeId).order("sort_order"),
    ids.length ? client.from("child_challenge_progress").select("child_profile_id,status").eq("challenge_id", challengeId).in("child_profile_id", ids) : Promise.resolve({ data: [], error: null }),
  ]);
  if (challenge.error || steps.error || progress.error || !challenge.data || challenge.data.id !== challengeId) throw new Error("Challenge could not be loaded");
  const rows = progress.data ?? [];
  if (rows.some(row => !ids.includes(row.child_profile_id)) || new Set(rows.map(row => row.child_profile_id)).size !== rows.length) throw new Error("Progress could not be confirmed");
  return { challenge: challenge.data as FamilyChallenge, steps: (steps.data ?? []) as FamilyChallengeStep[], progress: rows };
}

// A removed participant must never remain in the outgoing credit request.
export function currentFamilySelection(selected: string[], available: string[]) {
  return [...new Set(selected)].filter(id => available.includes(id));
}
