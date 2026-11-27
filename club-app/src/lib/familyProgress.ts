import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

type SummaryRow = Database["public"]["Views"]["parent_child_progress_summary"]["Row"];
export type ChildSummary = { [K in keyof SummaryRow]: NonNullable<SummaryRow[K]> };
export type BookAdventureSummary = Database["public"]["Functions"]["get_child_book_adventure_summary"]["Returns"][number];

export async function readFamilyProgress(client: SupabaseClient<Database>, householdId: string) {
  if (!householdId) throw new Error("A family hub is required.");
  const [summaryResult, childResult, bookResult] = await Promise.all([
    client.from("parent_child_progress_summary").select("*").eq("household_id", householdId).order("display_name", { ascending: true }),
    client.from("child_profiles").select("id").eq("household_id", householdId).eq("status", "active"),
    client.from("books").select("id,book_number,title").in("status", ["coming_soon", "published"])
      .order("book_number", { ascending: true }).limit(1).maybeSingle()
  ]);
  const error = summaryResult.error || childResult.error || bookResult.error;
  if (error) throw error;
  if (!summaryResult.data || !childResult.data) throw new Error("Family progress could not be confirmed.");
  const activeIds = new Set(childResult.data.map(child => child.id));
  const summaries: ChildSummary[] = [];
  for (const row of summaryResult.data) {
    if (row.household_id !== householdId || !row.child_profile_id) throw new Error("Family progress scope could not be confirmed.");
    if (!activeIds.has(row.child_profile_id)) continue;
    if (!row.display_name || Object.values(row).some(value => value === null)) throw new Error("A child progress summary is incomplete.");
    summaries.push(row as ChildSummary);
  }
  if (summaries.length !== activeIds.size || new Set(summaries.map(row => row.child_profile_id)).size !== activeIds.size) {
    throw new Error("Some child progress summaries are missing.");
  }
  const book = bookResult.data;
  const bookProgress: Record<string, BookAdventureSummary> = {};
  const bookErrors: Record<string, boolean> = {};
  if (book) await Promise.all(summaries.map(async child => {
    try {
      const { data, error } = await client.rpc("get_child_book_adventure_summary", {
        p_child_profile_id: child.child_profile_id, p_book_id: book.id
      });
      if (error || !data?.[0]) throw error || new Error("Book progress unavailable.");
      bookProgress[child.child_profile_id] = data[0];
    } catch { bookErrors[child.child_profile_id] = true; }
  }));
  return { summaries, book, bookProgress, bookErrors };
}
