import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type LevelProgress = {
  total_xp: number | null;
  current_level_number: number | null;
  current_level_name: string | null;
  next_level_number: number | null;
  next_level_name: string | null;
  next_level_minimum_xp: number | null;
  xp_to_next_level: number | null;
  level_progress_percent: number | null;
};

type StreakStatus = {
  challenge_series_id: string;
  series_name: string;
  active_weeks: number;
  best_weeks: number;
  current_cycle: number;
  last_completed_period: string | null;
  is_active: boolean;
};

type StreakBadge = {
  challenge_series_id: string;
  badge_id: string;
  badge_name: string;
  badge_tier: string | null;
  consecutive_weeks_required: number;
  current_weeks: number;
  best_weeks: number;
  is_active: boolean;
};

type AchievementProgress = {
  badge_id: string;
  badge_name: string;
  badge_description: string | null;
  badge_scope: string;
  badge_tier: string | null;
  badge_family_key: string | null;
  rule_id: string;
  rule_type: string;
  threshold_value: number | null;
  current_value: number | null;
  progress_percent: number | null;
  earned: boolean;
};

type BadgeAward = {
  id: string;
  awarded_at: string;
  badges:
    | {
        id: string;
        name: string;
        description: string | null;
        badge_scope: string;
        badge_tier: string | null;
        rarity: string;
      }
    | {
        id: string;
        name: string;
        description: string | null;
        badge_scope: string;
        badge_tier: string | null;
        rarity: string;
      }[]
    | null;
};

type StreakEarning = {
  id: string;
  earned_at: string;
  streak_cycle: number;
  streak_weeks_at_earn: number;
  badges:
    | { name: string; badge_tier: string | null }
    | { name: string; badge_tier: string | null }[]
    | null;
  challenge_series:
    | { name: string }
    | { name: string }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function BadgeIcon({ tier, active = true }: { tier: string | null; active?: boolean }) {
  const label = tier ? tier.slice(0, 1).toUpperCase() : "★";
  return <span className={active ? "trophy-badge-icon" : "trophy-badge-icon inactive"}>{label}</span>;
}

export function TrophyRoom({
  childId,
  childName
}: {
  childId: string;
  childName: string;
}) {
  const [level, setLevel] = useState<LevelProgress | null>(null);
  const [weeklyStars, setWeeklyStars] = useState(0);
  const [streaks, setStreaks] = useState<StreakStatus[]>([]);
  const [streakBadges, setStreakBadges] = useState<StreakBadge[]>([]);
  const [achievementProgress, setAchievementProgress] = useState<AchievementProgress[]>([]);
  const [lifetimeAwards, setLifetimeAwards] = useState<BadgeAward[]>([]);
  const [streakHistory, setStreakHistory] = useState<StreakEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [
      levelResult,
      starsResult,
      streakResult,
      streakBadgeResult,
      progressResult,
      awardsResult,
      historyResult
    ] = await Promise.all([
      supabase
        .from("child_level_progress")
        .select("*")
        .eq("child_profile_id", childId)
        .maybeSingle(),
      supabase
        .from("child_token_totals")
        .select("total")
        .eq("child_profile_id", childId)
        .eq("token_type", "weekly_star")
        .maybeSingle(),
      supabase
        .from("child_series_streak_status")
        .select("challenge_series_id,series_name,active_weeks,best_weeks,current_cycle,last_completed_period,is_active")
        .eq("child_profile_id", childId)
        .order("series_name", { ascending: true }),
      supabase
        .from("child_active_streak_badges")
        .select("challenge_series_id,badge_id,badge_name,badge_tier,consecutive_weeks_required,current_weeks,best_weeks,is_active")
        .eq("child_profile_id", childId)
        .order("consecutive_weeks_required", { ascending: true }),
      supabase.rpc("get_child_achievement_progress", {
        p_child_profile_id: childId
      }),
      supabase
        .from("badge_awards")
        .select("id,awarded_at,badges(id,name,description,badge_scope,badge_tier,rarity)")
        .eq("child_profile_id", childId)
        .order("awarded_at", { ascending: false }),
      supabase
        .from("streak_badge_earnings")
        .select("id,earned_at,streak_cycle,streak_weeks_at_earn,badges(name,badge_tier),challenge_series(name)")
        .eq("child_profile_id", childId)
        .order("earned_at", { ascending: false })
    ]);

    const firstError =
      levelResult.error ||
      starsResult.error ||
      streakResult.error ||
      streakBadgeResult.error ||
      progressResult.error ||
      awardsResult.error ||
      historyResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setLevel((levelResult.data ?? null) as LevelProgress | null);
    setWeeklyStars(Number(starsResult.data?.total ?? 0));
    setStreaks((streakResult.data ?? []) as StreakStatus[]);
    setStreakBadges((streakBadgeResult.data ?? []) as StreakBadge[]);
    setAchievementProgress((progressResult.data ?? []) as AchievementProgress[]);
    setLifetimeAwards((awardsResult.data ?? []) as BadgeAward[]);
    setStreakHistory((historyResult.data ?? []) as StreakEarning[]);
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  const nextBadges = useMemo(
    () =>
      achievementProgress
        .filter((badge) => !badge.earned)
        .sort((a, b) => (b.progress_percent ?? 0) - (a.progress_percent ?? 0))
        .slice(0, 4),
    [achievementProgress]
  );

  const earnedLifetime = useMemo(
    () =>
      lifetimeAwards
        .map((award) => ({ award, badge: firstRelation(award.badges) }))
        .filter((item) => item.badge),
    [lifetimeAwards]
  );

  if (loading) {
    return (
      <section className="trophy-loading">
        <div className="loader" />
        <span>Opening {childName}'s Trophy Room...</span>
      </section>
    );
  }

  return (
    <div className="trophy-room">
      <section className="trophy-hero">
        <div>
          <p className="eyebrow gold">Courage Cabinet</p>
          <h1>{childName}'s Trophy Room</h1>
          <p>
            Every star tells a story. Every badge marks growth. Keep building faith, courage, and consistency.
          </p>
        </div>
        <div className="level-medallion">
          <span>Level</span>
          <strong>{level?.current_level_number ?? 1}</strong>
          <small>{level?.current_level_name || "Getting Started"}</small>
        </div>
      </section>

      {error && <div className="form-message">{error}</div>}

      <section className="level-progress-card">
        <div className="level-progress-copy">
          <div>
            <p className="eyebrow red">Level Progress</p>
            <h2>{level?.current_level_name || "Adventure Begins"}</h2>
          </div>
          <div className="level-xp">
            <strong>{Number(level?.total_xp ?? 0)}</strong>
            <span>XP</span>
          </div>
        </div>
        <div className="level-progress-track" aria-label="Level progress">
          <span style={{ width: `${Math.min(100, Math.max(0, level?.level_progress_percent ?? 0))}%` }} />
        </div>
        <div className="level-progress-meta">
          {level?.next_level_name ? (
            <>
              <span>{level.xp_to_next_level ?? 0} XP to go</span>
              <strong>Next: {level.next_level_name}</strong>
            </>
          ) : (
            <>
              <span>Current XP milestone reached</span>
              <strong>More levels coming</strong>
            </>
          )}
        </div>
      </section>

      <section className="trophy-summary-grid">
        <article className="star-vault">
          <p className="eyebrow gold">Weekly Wins</p>
          <div className="star-count">
            <span>★</span>
            <strong>{weeklyStars}</strong>
          </div>
          <h3>Weekly Stars</h3>
          <p>Earn another star each time a qualifying weekly challenge is completed.</p>
        </article>

        <article>
          <p className="eyebrow red">Lifetime</p>
          <strong className="summary-number">{earnedLifetime.length}</strong>
          <h3>Permanent Badges</h3>
          <p>These achievements stay in the Courage Cabinet forever.</p>
        </article>

        <article>
          <p className="eyebrow red">Consistency</p>
          <strong className="summary-number">{streakBadges.filter((badge) => badge.is_active).length}</strong>
          <h3>Active Streak Badges</h3>
          <p>Keep the weekly streak alive to keep these badges active.</p>
        </article>
      </section>

      <section className="trophy-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow red">Keep Showing Up</p>
            <h2>Weekly streaks</h2>
          </div>
        </div>

        {streaks.length ? (
          <div className="streak-series-grid">
            {streaks.map((streak) => {
              const seriesBadges = streakBadges.filter(
                (badge) => badge.challenge_series_id === streak.challenge_series_id
              );
              const next = seriesBadges.find(
                (badge) => badge.consecutive_weeks_required > streak.active_weeks
              );

              return (
                <article className={streak.is_active ? "streak-series-card active" : "streak-series-card"} key={streak.challenge_series_id}>
                  <div className="streak-series-top">
                    <div>
                      <span>{streak.is_active ? "Active streak" : "Build a new streak"}</span>
                      <h3>{streak.series_name}</h3>
                    </div>
                    <strong>{streak.active_weeks}</strong>
                  </div>
                  <p className="streak-caption">consecutive weeks · best ever {streak.best_weeks}</p>
                  <div className="streak-badge-line">
                    {seriesBadges.map((badge) => (
                      <div className="mini-streak-badge" key={badge.badge_id}>
                        <BadgeIcon tier={badge.badge_tier} active={badge.is_active} />
                        <span>{badge.consecutive_weeks_required} wk</span>
                      </div>
                    ))}
                  </div>
                  {next ? (
                    <p className="next-streak-note">
                      {Math.max(0, next.consecutive_weeks_required - streak.active_weeks)} more week
                      {next.consecutive_weeks_required - streak.active_weeks === 1 ? "" : "s"} to {next.badge_name}
                    </p>
                  ) : (
                    <p className="next-streak-note">Top configured streak level reached.</p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">★</div>
            <h3>Your first weekly streak starts with one win.</h3>
            <p>Complete a qualifying weekly challenge and this section will start tracking consistency.</p>
          </div>
        )}
      </section>

      <section className="trophy-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow gold">Forever Yours</p>
            <h2>Lifetime achievements</h2>
          </div>
          <span className="pill">{earnedLifetime.length} earned</span>
        </div>

        {earnedLifetime.length ? (
          <div className="badge-cabinet-grid">
            {earnedLifetime.map(({ award, badge }) => (
              <article className="badge-cabinet-card earned" key={award.id}>
                <BadgeIcon tier={badge!.badge_tier} />
                <div>
                  <span>{badge!.badge_tier || badge!.rarity}</span>
                  <h3>{badge!.name}</h3>
                  <p>{badge!.description || "A Courageous achievement."}</p>
                  <small>Earned {new Date(award.awarded_at).toLocaleDateString()}</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <h3>Lifetime badges will live here.</h3>
            <p>They never disappear once earned.</p>
          </div>
        )}
      </section>

      <section className="trophy-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow red">Within Reach</p>
            <h2>Next badges</h2>
          </div>
        </div>

        {nextBadges.length ? (
          <div className="next-badge-grid">
            {nextBadges.map((badge) => (
              <article className="next-badge-card" key={badge.rule_id}>
                <BadgeIcon tier={badge.badge_tier} active={false} />
                <div className="next-badge-copy">
                  <span>{badge.badge_scope.replaceAll("_", " ")}</span>
                  <h3>{badge.badge_name}</h3>
                  <div className="mini-progress-track">
                    <span style={{ width: `${badge.progress_percent ?? 0}%` }} />
                  </div>
                  <small>
                    {badge.current_value ?? 0} / {badge.threshold_value ?? "?"} · {badge.progress_percent ?? 0}%
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <h3>No next lifetime badge is configured yet.</h3>
          </div>
        )}
      </section>

      {streakHistory.length > 0 && (
        <section className="trophy-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow gold">You Did It Before</p>
              <h2>Streak badge history</h2>
            </div>
          </div>
          <div className="streak-history-list">
            {streakHistory.slice(0, 8).map((earning) => {
              const badge = firstRelation(earning.badges);
              const series = firstRelation(earning.challenge_series);
              return (
                <article key={earning.id}>
                  <BadgeIcon tier={badge?.badge_tier ?? null} />
                  <div>
                    <strong>{badge?.name || "Streak badge"}</strong>
                    <span>{series?.name || "Weekly series"} · {earning.streak_weeks_at_earn} weeks</span>
                  </div>
                  <time>{new Date(earning.earned_at).toLocaleDateString()}</time>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
