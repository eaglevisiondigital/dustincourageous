import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
type Child = { display_name: string; household_id: string; status: string };
type Challenge = { title: string; challenge_type: string; xp_reward: number };
export type PendingApproval = {
  id: string; child_profile_id: string; challenge_id: string; submitted_at: string | null;
  child_profiles: Child | Child[] | null; challenges: Challenge | Challenge[] | null;
};
export function approvalRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}
export async function readParentApprovals(client: SupabaseClient<Database>, householdId: string, childIds: string[]) {
  const ids = [...new Set(childIds)];
  if (!ids.length) return { items: [] as PendingApproval[], hasMore: false };
  const { data, error } = await client.from("child_challenge_progress")
    .select("id,child_profile_id,challenge_id,submitted_at,child_profiles!inner(display_name,household_id,status),challenges(title,challenge_type,xp_reward)")
    .eq("child_profiles.household_id", householdId).eq("child_profiles.status", "active")
    .in("child_profile_id", ids).eq("status", "pending_parent")
    .order("submitted_at", { ascending: true }).order("id", { ascending: true }).limit(51);
  if (error) throw error;
  const rows = (data ?? []) as PendingApproval[];
  if (rows.some(row => {
    const child = approvalRelation(row.child_profiles);
    return !ids.includes(row.child_profile_id) || child?.household_id !== householdId || child.status !== "active";
  }) || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error("Approval queue could not be confirmed");
  return { items: rows.slice(0, 50), hasMore: rows.length > 50 };
}
export async function confirmParentDecision(client: SupabaseClient<Database>, progressId: string, childId: string, decision: "approve" | "return") {
  const { data, error } = await client.from("child_challenge_progress").select("id,child_profile_id,status")
    .eq("id", progressId).eq("child_profile_id", childId).single();
  if (error || data?.id !== progressId || data.child_profile_id !== childId || data.status !== (decision === "approve" ? "completed" : "in_progress")) throw new Error("Decision could not be confirmed");
}
