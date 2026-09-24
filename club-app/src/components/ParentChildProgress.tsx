import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Level = {
  total_xp: number | null;
  current_level_number: number | null;
  current_level_name: string | null;
  next_level_name: string | null;
  xp_to_next_level: number | null;
  level_progress_percent: number | null;
};

export function ParentChildProgress({
  childId,
  childName
}: {
  childId: string;
  childName: string;
}) {
  const [level, setLevel] = useState<Level | null>(null);
  const [weeklyStars, setWeeklyStars] = useState(0);
  const [lifetimeBadges, setLifetimeBadges] = useState(0);
  const [activeStreakBadges, setActiveStreakBadges] = useState(0);
  const [memorizedVerses, setMemorizedVerses] = useState(0);
  const [devotionals, setDevotionals] = useState(0);
  const [booksCompleted, setBooksCompleted] = useState(0);
  const [bestWeeklyStreak, setBestWeeklyStreak] = useState(0);
  const [activeWeeklyStreak, setActiveWeeklyStreak] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setError("");
    try {
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
      supabase.from("child_level_progress").select("*").eq("child_profile_id", childId).maybeSingle(),
      supabase.from("child_token_totals").select("total").eq("child_profile_id", childId).eq("token_type", "weekly_star").maybeSingle(),
      supabase.from("badge_awards").select("id", { count: "exact", head: true }).eq("child_profile_id", childId),
      supabase.from("child_active_streak_badges").select("badge_id", { count: "exact", head: true }).eq("child_profile_id", childId).eq("is_active", true),
      supabase.from("child_scripture_progress").select("id", { count: "exact", head: true }).eq("child_profile_id", childId).eq("status", "memorized"),
      supabase.from("child_devotional_progress").select("id", { count: "exact", head: true }).eq("child_profile_id", childId).eq("status", "completed"),
      supabase.from("child_book_progress").select("id", { count: "exact", head: true }).eq("child_profile_id", childId).in("status", ["completed","adventure_completed"]),
      supabase.from("child_series_streak_status").select("active_weeks,best_weeks").eq("child_profile_id", childId)
    ]);

    const firstError =
      levelResult.error ||
      starResult.error ||
      badgeResult.error ||
      activeBadgeResult.error ||
      verseResult.error ||
      devotionalResult.error ||
      bookResult.error ||
      streakResult.error;

    if (version !== loadVersion.current) return;
    if (firstError) throw firstError;

    setLevel((levelResult.data ?? null) as Level | null);
    setWeeklyStars(Number(starResult.data?.total ?? 0));
    setLifetimeBadges(badgeResult.count ?? 0);
    setActiveStreakBadges(activeBadgeResult.count ?? 0);
    setMemorizedVerses(verseResult.count ?? 0);
    setDevotionals(devotionalResult.count ?? 0);
    setBooksCompleted(bookResult.count ?? 0);

    const streakRows = streakResult.data ?? [];
    setBestWeeklyStreak(Math.max(0, ...streakRows.map((row) => row.best_weeks ?? 0)));
    setActiveWeeklyStreak(Math.max(0, ...streakRows.map((row) => row.active_weeks ?? 0)));
    } catch {
      if (version === loadVersion.current) setError("This progress snapshot could not be loaded. Please try again.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("dc-progress-updated", refresh);
    return () => {
      loadVersion.current += 1;
      window.removeEventListener("dc-progress-updated", refresh);
    };
  }, [load]);

  if (loading) return <section className="parent-progress-card" aria-busy="true"><p role="status">Loading {childName}'s progress...</p></section>;
  if (error) return <section className="parent-progress-card"><p role="alert">{error}</p><button className="secondary-button" onClick={() => void load()}>Try again</button></section>;

  return (
    <section className="parent-progress-card">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow gold">Progress Snapshot</p>
          <h2>{childName}</h2>
        </div>
        <span className="pill">Level {level?.current_level_number ?? 1}</span>
      </div>

      {error && <div className="form-message">{error}</div>}

      <div className="parent-level-row">
        <div>
          <strong>{level?.current_level_name || "Getting Started"}</strong>
          <span>{Number(level?.total_xp ?? 0)} XP</span>
        </div>
        <div className="parent-level-next">
          {level?.next_level_name ? (
            <><span>{level.xp_to_next_level ?? 0} XP to</span><strong>{level.next_level_name}</strong></>
          ) : (
            <strong>Top configured level</strong>
          )}
        </div>
      </div>

      <div className="mini-progress-track parent-progress-track">
        <span style={{ width: `${level?.level_progress_percent ?? 0}%` }} />
      </div>

      <div className="parent-progress-grid">
        <article><strong>{weeklyStars}</strong><span>Weekly Stars</span></article>
        <article><strong>{lifetimeBadges}</strong><span>Lifetime Badges</span></article>
        <article><strong>{activeStreakBadges}</strong><span>Active Streak Badges</span></article>
        <article><strong>{memorizedVerses}</strong><span>Verses Memorized</span></article>
        <article><strong>{devotionals}</strong><span>Devotional Days</span></article>
        <article><strong>{booksCompleted}</strong><span>Books Finished</span></article>
        <article><strong>{activeWeeklyStreak}</strong><span>Current Weekly Streak</span></article>
        <article><strong>{bestWeeklyStreak}</strong><span>Best Weekly Streak</span></article>
      </div>
    </section>
  );
}
