import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

export type ChildSnapshot = {
  xp: number;
  badges: number;
  weeklyStars: number;
  streak: number;
  completedChallenges: number;
};

// Return a complete snapshot or an error. Failed queries must never look like zero progress.
export async function readChildDashboard(client: SupabaseClient<Database>, childId: string) {
  const results = await Promise.all([
    client.from("child_xp_totals").select("total_xp").eq("child_profile_id", childId).maybeSingle(),
    client.from("badge_awards").select("id", { count: "exact", head: true }).eq("child_profile_id", childId),
    client.from("child_active_streak_badges").select("badge_id", { count: "exact", head: true }).eq("child_profile_id", childId).eq("is_active", true),
    client.from("child_token_totals").select("total").eq("child_profile_id", childId).eq("token_type", "weekly_star").maybeSingle(),
    client.from("child_streaks").select("current_count").eq("child_profile_id", childId).eq("streak_key", "challenge_completion").maybeSingle(),
    client.from("child_challenge_progress").select("id", { count: "exact", head: true }).eq("child_profile_id", childId).eq("status", "completed"),
    client.from("challenges").select("id,title,description,challenge_type,xp_reward,access_level,parent_approval_required")
      .eq("status", "published").order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(6)
  ]);
  const error = results.find(result => result.error)?.error;
  if (error) throw error;
  const [xp, badges, streakBadges, stars, streak, progress, challenges] = results;
  return {
    snapshot: {
      xp: Number(xp.data?.total_xp ?? 0),
      badges: (badges.count ?? 0) + (streakBadges.count ?? 0),
      weeklyStars: Number(stars.data?.total ?? 0),
      streak: streak.data?.current_count ?? 0,
      completedChallenges: progress.count ?? 0
    } satisfies ChildSnapshot,
    challenges: challenges.data ?? []
  };
}
