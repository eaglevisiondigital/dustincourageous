import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export async function readBookAdventure(client: SupabaseClient<Database>, childId: string, bookId: string) {
  const args = { p_child_profile_id: childId, p_book_id: bookId };
  const [steps, summary] = await Promise.all([
    client.rpc("get_child_book_adventure_steps", args), client.rpc("get_child_book_adventure_summary", args)
  ]);
  if (steps.error || summary.error) throw steps.error || summary.error;
  if (!steps.data || !summary.data?.[0]) throw new Error("Book Adventure progress could not be confirmed.");
  return { steps: steps.data, summary: summary.data[0] };
}

export async function saveBookStatus(client: SupabaseClient<Database>, childId: string, bookId: string, status: "reading" | "completed") {
  const read = () => client.from("child_book_progress").select("id,status,started_at,completed_at")
    .eq("child_profile_id",childId).eq("book_id",bookId).maybeSingle();
  const before = await read();
  if (before.error) throw before.error;
  const meetsStatus = (value: string | undefined) => value === "adventure_completed" || value === "completed" || (status === "reading" && value === "reading");
  if (meetsStatus(before.data?.status)) return;
  const now = new Date().toISOString();
  const values = {status,started_at:before.data?.started_at ?? now,completed_at:status === "completed" ? before.data?.completed_at ?? now : null};
  const result = before.data
    ? await client.from("child_book_progress").update(values).eq("id",before.data.id)
      .eq("child_profile_id",childId).eq("book_id",bookId).eq("status",before.data.status)
    : await client.from("child_book_progress").upsert({...values,child_profile_id:childId,book_id:bookId},
      {onConflict:"child_profile_id,book_id",ignoreDuplicates:true});
  if (result.error) throw result.error;
  const after = await read();
  if (after.error) throw after.error;
  if (!meetsStatus(after.data?.status)) throw new Error("Book progress could not be confirmed. Refresh before trying again.");
}

export async function finishBookAdventure(client: SupabaseClient<Database>, childId: string, bookId: string) {
  const {data,error} = await client.rpc("complete_child_book_adventure", {p_child_profile_id:childId,p_book_id:bookId});
  if (error) throw error;
  if (data !== true) throw new Error("Adventure completion could not be confirmed.");
  const saved = await client.from("child_book_progress").select("status,adventure_completed_at")
    .eq("child_profile_id",childId).eq("book_id",bookId).single();
  if (saved.error) throw saved.error;
  if (saved.data?.status !== "adventure_completed" || !saved.data.adventure_completed_at) throw new Error("Saved adventure completion could not be confirmed.");
}

export async function completeBookStep(client: SupabaseClient<Database>, childId: string, kind: string, sourceId: string) {
  if (kind === "identity") {
    const {data,error} = await client.from("child_identity_progress").upsert({child_profile_id:childId,identity_truth_id:sourceId,learned:true,learned_at:new Date().toISOString()},
      {onConflict:"child_profile_id,identity_truth_id"}).select("child_profile_id,identity_truth_id,learned").single();
    if (error) throw error;
    if (data?.child_profile_id !== childId || data.identity_truth_id !== sourceId || data.learned !== true) throw new Error("Identity step could not be confirmed.");
  } else if (kind === "prayer") {
    const {error} = await client.from("child_prayer_progress").upsert({child_profile_id:childId,prayer_prompt_id:sourceId,completed_at:new Date().toISOString()},
      {onConflict:"child_profile_id,prayer_prompt_id",ignoreDuplicates:true});
    if (error) throw error;
    const saved = await client.from("child_prayer_progress").select("completed_at").eq("child_profile_id",childId).eq("prayer_prompt_id",sourceId).single();
    if (saved.error) throw saved.error;
    if (!saved.data?.completed_at) throw new Error("Prayer step could not be confirmed.");
  } else throw new Error("Open this step in its activity area to complete it.");
}
