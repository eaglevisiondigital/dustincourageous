import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export function activityExternalUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

type Asset = Pick<Database["public"]["Tables"]["media_assets"]["Row"], "bucket_name" | "object_path" | "visibility">;
export async function activityAssetUrl(client: SupabaseClient<Database>, asset: Asset) {
  let value: unknown;
  if (asset.bucket_name === "dc-public" && asset.visibility === "public") {
    value = client.storage.from(asset.bucket_name).getPublicUrl(asset.object_path).data.publicUrl;
  } else {
    const { data, error } = await client.storage.from(asset.bucket_name).createSignedUrl(asset.object_path, 900);
    if (error) throw error;
    value = data?.signedUrl;
  }
  const url = activityExternalUrl(value);
  if (!url) throw new Error("A secure activity link could not be prepared.");
  return url;
}

export async function completeActivity(client: SupabaseClient<Database>, childId: string, contentId: string) {
  if (!childId || !contentId) throw new Error("Choose a child and activity.");
  const read = () => client.from("child_content_progress").select("id,status,started_at,completed_at")
    .eq("child_profile_id", childId).eq("content_item_id", contentId).maybeSingle();
  const previous = await read();
  if (previous.error) throw previous.error;
  if (previous.data?.status === "completed") return;
  const now = new Date().toISOString();
  const result = previous.data
    ? await client.from("child_content_progress").update({status:"completed",completed_at:now,started_at:previous.data.started_at ?? now})
      .eq("id",previous.data.id).eq("child_profile_id",childId).eq("content_item_id",contentId).eq("status",previous.data.status)
    : await client.from("child_content_progress").upsert({child_profile_id:childId,content_item_id:contentId,status:"completed",started_at:now,completed_at:now},
      {onConflict:"child_profile_id,content_item_id",ignoreDuplicates:true});
  if (result.error) throw result.error;
  const confirmed = await read();
  if (confirmed.error) throw confirmed.error;
  if (confirmed.data?.status !== "completed") throw new Error("Activity completion could not be confirmed. Refresh before trying again.");
}
