import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export async function readChildReadingHistory(client: SupabaseClient<Database>, childId: string) {
  if (!childId) throw new Error("Choose a child.");
  const { data, error } = await client.from("child_book_reading_positions")
    .select("child_profile_id,book_id,revision,page_number,updated_at,books(title)")
    .eq("child_profile_id", childId).order("updated_at", { ascending: false }).limit(20);
  if (error) throw error;
  if (!data || data.some(row => row.child_profile_id !== childId || !row.book_id ||
    !Number.isInteger(row.page_number) || row.page_number < 1 || row.page_number > 300 ||
    !Number.isFinite(Date.parse(row.updated_at)))) throw new Error("Reading history is unavailable.");
  return data.map(row => ({
    bookId: row.book_id,
    title: row.books?.title || "Book currently unavailable",
    page: row.page_number,
    updatedAt: row.updated_at
  }));
}
