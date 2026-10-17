import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export async function readParentChildSnapshot(client: SupabaseClient<Database>, childId: string) {
  if (!childId) throw new Error("Choose a child.");
    const [
      levelResult,
      starResult,
      badgeResult,
      activeBadgeResult,
      verseResult,
      devotionalResult,
      bookResult,
      streakResult
    ] = await Promise.all([
      client.from("child_level_progress").select("*").eq("child_profile_id", childId).maybeSingle(),
      client.from("child_token_totals").select("total").eq("child_profile_id", childId).eq("token_type", "weekly_star").maybeSingle(),
      client.from("badge_awards").select("id", { count: "exact", head: true }).eq("child_profile_id", childId),
      client.from("child_active_streak_badges").select("badge_id", { count: "exact", head: true }).eq("child_profile_id", childId).eq("is_active", true),
      client.from("child_scripture_progress").select("id", { count: "exact", head: true }).eq("child_profile_id", childId).eq("status", "memorized"),
      client.from("child_devotional_progress").select("id", { count: "exact", head: true }).eq("child_profile_id", childId).eq("status", "completed"),
      client.from("child_book_progress").select("id", { count: "exact", head: true }).eq("child_profile_id", childId).in("status", ["completed","adventure_completed"]),
      client.from("child_series_streak_status").select("active_weeks,best_weeks").eq("child_profile_id", childId)
    ]);


  const results = [levelResult, starResult, badgeResult, activeBadgeResult, verseResult, devotionalResult, bookResult, streakResult];
  for (const result of results) if (result.error) throw result.error;
  for (const result of [badgeResult, activeBadgeResult, verseResult, devotionalResult, bookResult]) {
    if (typeof result.count !== "number" || !Number.isSafeInteger(result.count) || result.count < 0)
      throw new Error("A progress total could not be confirmed.");
  }
  if (!streakResult.data) throw new Error("Streak progress could not be confirmed.");
  return { levelResult, starResult, badgeResult, activeBadgeResult, verseResult, devotionalResult, bookResult, streakResult };
}
