import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export async function readTrophyData(client: SupabaseClient<Database>, childId: string) {
  if (!childId) throw new Error("Choose a child.");
    const [
      levelResult,
      starsResult,
      streakResult,
      streakBadgeResult,
      progressResult,
      awardsResult,
      historyResult
    ] = await Promise.all([
      client
        .from("child_level_progress")
        .select("*")
        .eq("child_profile_id", childId)
        .maybeSingle(),
      client
        .from("child_token_totals")
        .select("total")
        .eq("child_profile_id", childId)
        .eq("token_type", "weekly_star")
        .maybeSingle(),
      client
        .from("child_series_streak_status")
        .select("challenge_series_id,series_name,active_weeks,best_weeks,current_cycle,last_completed_period,is_active")
        .eq("child_profile_id", childId)
        .order("series_name", { ascending: true }),
      client
        .from("child_active_streak_badges")
        .select("challenge_series_id,badge_id,badge_name,badge_tier,consecutive_weeks_required,current_weeks,best_weeks,is_active")
        .eq("child_profile_id", childId)
        .order("consecutive_weeks_required", { ascending: true }),
      client.rpc("get_child_achievement_progress", {
        p_child_profile_id: childId
      }),
      client
        .from("badge_awards")
        .select("id,awarded_at,badges(id,name,description,badge_scope,badge_tier,rarity)")
        .eq("child_profile_id", childId)
        .order("awarded_at", { ascending: false }),
      client
        .from("streak_badge_earnings")
        .select("id,earned_at,streak_cycle,streak_weeks_at_earn,badges(name,badge_tier),challenge_series(name)")
        .eq("child_profile_id", childId)
        .order("earned_at", { ascending: false })
    ]);

    const firstError = levelResult.error || starsResult.error || streakResult.error ||
      streakBadgeResult.error || progressResult.error || awardsResult.error || historyResult.error;
    if (firstError) throw firstError;
    if (!streakResult.data || !streakBadgeResult.data || !progressResult.data || !awardsResult.data || !historyResult.data)
      throw new Error("Trophy data could not be confirmed.");
    return { levelResult, starsResult, streakResult, streakBadgeResult, progressResult, awardsResult, historyResult };
}
