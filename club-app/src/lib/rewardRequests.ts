import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
export function rewardStatusLabel(status: string) {
  const labels: Record<string, string> = { requested: "Requested", approved: "Approved", denied: "Denied", processing: "Processing", fulfilled: "Fulfilled" };
  return labels[status] ?? "Status Unavailable";
}
export async function moveRewardRequest(client: SupabaseClient<Database>, id: string, current: string, next: string) {
  const transitions: Record<string, string[]> = { requested: ["approved", "denied"], approved: ["processing", "fulfilled"], processing: ["fulfilled"] };
  if (!transitions[current]?.includes(next)) throw new Error("Unsupported reward transition");
  const {data,error} = await client.from("reward_redemptions").update({status:next}).eq("id",id).eq("status",current).select("id,status").single();
  if (error || data?.id !== id || data.status !== next) throw new Error("Reward update could not be confirmed");
}
export async function requestUnlockedReward(client: SupabaseClient<Database>, unlockId: string, userId: string) {
  const {data,error} = await client.from("reward_redemptions").insert({reward_unlock_id:unlockId,requested_by:userId,status:"requested"}).select("reward_unlock_id,status").single();
  if (error || data?.reward_unlock_id !== unlockId || data.status !== "requested") throw new Error("Reward request could not be confirmed");
}
