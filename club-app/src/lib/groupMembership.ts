import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type GroupApproval = {
  code: string;
  childId: string;
  groupId: string;
};

export function matchesGroupApproval(approval: GroupApproval, code: string, childId: string) {
  return approval.code === code.trim() && approval.childId === childId;
}

export async function joinApprovedGroup(client: SupabaseClient<Database>, approval: GroupApproval) {
  const { data, error } = await client.rpc("join_child_to_group", {
    p_code: approval.code, p_child_profile_id: approval.childId
  });
  if (error) throw error;
  if (data !== approval.groupId) throw new Error("The joined group could not be confirmed.");
  await verifyMembership(client, approval.groupId, approval.childId, "active");
}

export async function withdrawGroup(client: SupabaseClient<Database>, groupId: string, childId: string) {
  const { error } = await client.rpc("withdraw_child_from_group", {
    p_group_id: groupId, p_child_profile_id: childId
  });
  if (error) throw error;
  await verifyMembership(client, groupId, childId, "withdrawn");
}

async function verifyMembership(client: SupabaseClient<Database>, groupId: string, childId: string, status: string) {
  const { data, error } = await client.from("child_group_memberships")
    .select("status").eq("group_id", groupId).eq("child_profile_id", childId).single();
  if (error) throw error;
  if (data?.status !== status) throw new Error("Group membership status could not be confirmed. Refresh before trying again.");
}
