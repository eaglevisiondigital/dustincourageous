import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type FamilyAssignment = {
  id: string; groupId: string; groupName: string; childIds: string[];
  dueAt: string | null;
  challenge: { id: string; title: string; xp_reward: number } | null;
};
function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function loadFamilyAssignments(client: SupabaseClient<Database>, childIds: string[]): Promise<FamilyAssignment[]> {
  const ids = [...new Set(childIds.filter(Boolean))];
  if (!ids.length) return [];
  const memberships = await client.from("child_group_memberships")
    .select("group_id,child_profile_id,status,adventure_groups(id,name,status)")
    .in("child_profile_id", ids).eq("status", "active");
  if (memberships.error) throw memberships.error;
  const groups = new Map<string, { name: string; childIds: string[] }>();
  for (const row of memberships.data ?? []) {
    if (!ids.includes(row.child_profile_id) || row.status !== "active") throw new Error("Unexpected group membership");
    const group = first(row.adventure_groups);
    if (!group || group.status !== "active") continue;
    if (group.id !== row.group_id) throw new Error("Unexpected group");
    const entry = groups.get(group.id) ?? { name: group.name, childIds: [] };
    if (!entry.childIds.includes(row.child_profile_id)) entry.childIds.push(row.child_profile_id);
    groups.set(group.id, entry);
  }
  if (!groups.size) return [];
  const assignments = await client.from("group_challenge_assignments")
    .select("id,group_id,challenge_id,due_at,challenges(id,title,xp_reward,status)")
    .in("group_id", [...groups.keys()]).eq("challenges.status", "published")
    .order("assigned_at", { ascending: false }).order("id", { ascending: false }).limit(100);
  if (assignments.error) throw assignments.error;
  return (assignments.data ?? []).map(row => {
    const group = groups.get(row.group_id);
    const challenge = first(row.challenges);
    if (!group || (challenge && (challenge.id !== row.challenge_id || challenge.status !== "published"))) throw new Error("Unexpected assignment");
    return { id: row.id, groupId: row.group_id, groupName: group.name, childIds: group.childIds,
      dueAt: row.due_at, challenge: challenge ? { id: challenge.id, title: challenge.title, xp_reward: challenge.xp_reward } : null };
  });
}

export async function loadHouseholdAssignments(client: SupabaseClient<Database>, householdId: string, childIds: string[]): Promise<FamilyAssignment[]> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ids = [...new Set(childIds)];
  if (!uuid.test(householdId) || ids.some(id => !uuid.test(id))) throw new Error("Invalid family assignment scope");
  if (!ids.length) return [];
  const result = await client.from("challenge_assignments")
    .select("id,household_id,child_profile_id,challenge_id,due_at,challenges(id,title,xp_reward,status)")
    .eq("household_id", householdId)
    .or(`child_profile_id.is.null,child_profile_id.in.(${ids.join(",")})`)
    .eq("challenges.status", "published")
    .order("assigned_at", { ascending: false }).order("id", { ascending: false }).limit(100);
  if (result.error) throw result.error;
  return (result.data ?? []).map(row => {
    const challenge = first(row.challenges);
    if (row.household_id !== householdId || (row.child_profile_id !== null && !ids.includes(row.child_profile_id)) ||
      (challenge && (challenge.id !== row.challenge_id || challenge.status !== "published"))) throw new Error("Unexpected family assignment");
    return { id: "household:" + row.id, groupId: "", groupName: row.child_profile_id ? "Child Assignment" : "Whole Family",
      childIds: row.child_profile_id ? [row.child_profile_id] : ids, dueAt: row.due_at,
      challenge: challenge ? { id: challenge.id, title: challenge.title, xp_reward: challenge.xp_reward } : null };
  });
}
