import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Series = {
  id: string;
  series_key: string;
  name: string;
  description: string | null;
  token_type: string;
  token_amount: number;
  status: string;
};

type WeeklyChallenge = {
  id: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  xp_reward: number;
  challenge_series_id: string | null;
};

type StreakRule = {
  id: string;
  challenge_series_id: string;
  consecutive_weeks_required: number;
  badges:
    | { id: string; name: string; badge_tier: string | null; rarity: string }
    | { id: string; name: string; badge_tier: string | null; rarity: string }[]
    | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function nextMonday() {
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = date.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  date.setDate(date.getDate() + daysUntilMonday);
  return date.toISOString().slice(0, 10);
}

export function WeeklySeriesAdmin() {
  const [series, setSeries] = useState<Series[]>([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState<WeeklyChallenge[]>([]);
  const [streakRules, setStreakRules] = useState<StreakRule[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  const [seriesName, setSeriesName] = useState("");
  const [seriesKey, setSeriesKey] = useState("");
  const [seriesDescription, setSeriesDescription] = useState("");

  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeSlug, setChallengeSlug] = useState("");
  const [periodStart, setPeriodStart] = useState(nextMonday());
  const [challengeDescription, setChallengeDescription] = useState("");
  const [challengeType, setChallengeType] = useState("weekly");
  const [xpReward, setXpReward] = useState("100");
  const [steps, setSteps] = useState("");
  const [publishNow, setPublishNow] = useState(false);

  const [badgeName, setBadgeName] = useState("");
  const [badgeKey, setBadgeKey] = useState("");
  const [badgeWeeks, setBadgeWeeks] = useState("4");
  const [badgeTier, setBadgeTier] = useState("bronze");
  const [badgeRarity, setBadgeRarity] = useState("standard");
  const [badgeDescription, setBadgeDescription] = useState("");

  const load = useCallback(async () => {
    const [seriesResult, challengeResult, ruleResult] = await Promise.all([
      supabase
        .from("challenge_series")
        .select("id,series_key,name,description,token_type,token_amount,status")
        .order("created_at", { ascending: true }),
      supabase
        .from("challenges")
        .select("id,title,period_start,period_end,status,xp_reward,challenge_series_id")
        .not("challenge_series_id", "is", null)
        .order("period_start", { ascending: false }),
      supabase
        .from("series_badge_rules")
        .select("id,challenge_series_id,consecutive_weeks_required,badges(id,name,badge_tier,rarity)")
        .eq("is_active", true)
        .order("consecutive_weeks_required", { ascending: true })
    ]);

    const error = seriesResult.error || challengeResult.error || ruleResult.error;
    if (error) {
      setMessage(error.message);
      return;
    }

    const nextSeries = (seriesResult.data ?? []) as Series[];
    setSeries(nextSeries);
    setWeeklyChallenges((challengeResult.data ?? []) as WeeklyChallenge[]);
    setStreakRules((ruleResult.data ?? []) as StreakRule[]);

    if (!selectedSeriesId && nextSeries.length) {
      setSelectedSeriesId(nextSeries[0].id);
    }
  }, [selectedSeriesId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedSeries = useMemo(
    () => series.find((item) => item.id === selectedSeriesId) ?? null,
    [series, selectedSeriesId]
  );

  async function createSeries(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setMessage("");

    const { data, error } = await supabase.rpc("admin_create_challenge_series", {
      p_series_key: seriesKey || slugify(seriesName),
      p_name: seriesName.trim(),
      p_description: seriesDescription.trim() || undefined,
      p_token_type: "weekly_star",
      p_token_amount: 1
    });

    setWorking(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSeriesName("");
    setSeriesKey("");
    setSeriesDescription("");
    setMessage("Weekly challenge series created.");
    await load();

    if (typeof data === "string") {
      setSelectedSeriesId(data);
    }
  }

  async function createWeeklyChallenge(event: FormEvent) {
    event.preventDefault();
    if (!selectedSeriesId) {
      setMessage("Create or select a weekly challenge series first.");
      return;
    }

    setWorking(true);
    setMessage("");

    const stepPayload = steps
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((title) => ({
        title,
        instructions: null,
        is_required: true,
        xp_reward: 0
      }));

    const { error } = await supabase.rpc("admin_create_weekly_challenge", {
      p_series_id: selectedSeriesId,
      p_title: challengeTitle.trim(),
      p_slug: challengeSlug || slugify(challengeTitle),
      p_period_start: periodStart,
      p_description: challengeDescription.trim() || undefined,
      p_challenge_type: challengeType,
      p_access_level: "free",
      p_xp_reward: Number(xpReward) || 0,
      p_parent_approval_required: false,
      p_status: publishNow ? "published" : "draft",
      p_steps: stepPayload
    });

    setWorking(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setChallengeTitle("");
    setChallengeSlug("");
    setChallengeDescription("");
    setSteps("");
    setPublishNow(false);

    const next = new Date(periodStart + "T12:00:00");
    next.setDate(next.getDate() + 7);
    setPeriodStart(next.toISOString().slice(0, 10));

    setMessage("Weekly challenge scheduled.");
    await load();
  }

  async function createStreakBadge(event: FormEvent) {
    event.preventDefault();
    if (!selectedSeriesId) {
      setMessage("Create or select a weekly challenge series first.");
      return;
    }

    setWorking(true);
    setMessage("");

    const { error } = await supabase.rpc("admin_create_series_streak_badge", {
      p_series_id: selectedSeriesId,
      p_badge_key: badgeKey || slugify(badgeName),
      p_name: badgeName.trim(),
      p_consecutive_weeks: Number(badgeWeeks),
      p_description: badgeDescription.trim() || undefined,
      p_tier: badgeTier || undefined,
      p_rarity: badgeRarity,
      p_active_only_while_current_streak: true
    });

    setWorking(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setBadgeName("");
    setBadgeKey("");
    setBadgeDescription("");
    setMessage("Streak badge level created.");
    await load();
  }

  const seriesChallenges = weeklyChallenges.filter(
    (challenge) => challenge.challenge_series_id === selectedSeriesId
  );
  const seriesRules = streakRules.filter(
    (rule) => rule.challenge_series_id === selectedSeriesId
  );

  return (
    <div className="weekly-series-admin">
      {message && <div className="form-message">{message}</div>}

      <section className="admin-card">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow red">Weekly System</p>
            <h2>Challenge series</h2>
          </div>
          <span className="pill">{series.length} series</span>
        </div>

        <div className="series-selector-row">
          <label>
            Active series
            <select value={selectedSeriesId} onChange={(event) => setSelectedSeriesId(event.target.value)}>
              <option value="">Select a series</option>
              {series.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="series-token-card">
            <span>Weekly token</span>
            <strong>{selectedSeries?.token_amount ?? 1} ★</strong>
            <small>{selectedSeries?.token_type?.replaceAll("_", " ") || "weekly star"}</small>
          </div>
        </div>

        <form className="admin-form series-create-form" onSubmit={createSeries}>
          <label>
            New series name
            <input
              required
              value={seriesName}
              onChange={(event) => {
                setSeriesName(event.target.value);
                if (!seriesKey) setSeriesKey(slugify(event.target.value));
              }}
            />
          </label>
          <label>
            Series key
            <input required value={seriesKey} onChange={(event) => setSeriesKey(slugify(event.target.value))} />
          </label>
          <label className="full">
            Description
            <textarea value={seriesDescription} onChange={(event) => setSeriesDescription(event.target.value)} />
          </label>
          <button className="secondary-button full" disabled={working}>
            Create another weekly series
          </button>
        </form>
      </section>

      {selectedSeries && (
        <div className="admin-two-column">
          <section className="admin-card">
            <p className="eyebrow gold">Schedule</p>
            <h2>Weekly challenge</h2>
            <form className="admin-form" onSubmit={createWeeklyChallenge}>
              <label>
                Challenge title
                <input
                  required
                  value={challengeTitle}
                  onChange={(event) => {
                    setChallengeTitle(event.target.value);
                    if (!challengeSlug) setChallengeSlug(slugify(event.target.value));
                  }}
                />
              </label>
              <label>
                Slug
                <input required value={challengeSlug} onChange={(event) => setChallengeSlug(slugify(event.target.value))} />
              </label>
              <label>
                Week starts
                <input required type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
              </label>
              <label>
                Challenge type
                <select value={challengeType} onChange={(event) => setChallengeType(event.target.value)}>
                  <option value="weekly">Weekly</option>
                  <option value="scripture">Scripture</option>
                  <option value="prayer">Prayer</option>
                  <option value="kindness">Kindness</option>
                  <option value="outreach">Outreach</option>
                  <option value="reading">Reading</option>
                  <option value="family">Family</option>
                  <option value="school">School</option>
                </select>
              </label>
              <label>
                XP reward
                <input type="number" min="0" value={xpReward} onChange={(event) => setXpReward(event.target.value)} />
              </label>
              <label className="admin-check">
                <input type="checkbox" checked={publishNow} onChange={(event) => setPublishNow(event.target.checked)} />
                Publish immediately
              </label>
              <label className="full">
                Description
                <textarea value={challengeDescription} onChange={(event) => setChallengeDescription(event.target.value)} />
              </label>
              <label className="full">
                Required steps
                <textarea
                  value={steps}
                  onChange={(event) => setSteps(event.target.value)}
                  placeholder={"One required step per line\nComplete the Power Verse\nDo the Courage Challenge"}
                />
              </label>
              <button className="primary-button full" disabled={working}>
                Schedule weekly challenge
              </button>
            </form>
          </section>

          <section className="admin-card">
            <p className="eyebrow gold">Consistency</p>
            <h2>Streak badge level</h2>
            <form className="admin-form" onSubmit={createStreakBadge}>
              <label>
                Badge name
                <input
                  required
                  value={badgeName}
                  onChange={(event) => {
                    setBadgeName(event.target.value);
                    if (!badgeKey) setBadgeKey(slugify(event.target.value));
                  }}
                />
              </label>
              <label>
                Badge key
                <input required value={badgeKey} onChange={(event) => setBadgeKey(slugify(event.target.value))} />
              </label>
              <label>
                Consecutive weeks
                <input required type="number" min="1" value={badgeWeeks} onChange={(event) => setBadgeWeeks(event.target.value)} />
              </label>
              <label>
                Tier
                <select value={badgeTier} onChange={(event) => setBadgeTier(event.target.value)}>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                  <option value="diamond">Diamond</option>
                  <option value="legendary">Legendary</option>
                </select>
              </label>
              <label>
                Rarity
                <select value={badgeRarity} onChange={(event) => setBadgeRarity(event.target.value)}>
                  <option value="standard">Standard</option>
                  <option value="special">Special</option>
                  <option value="rare">Rare</option>
                  <option value="legendary">Legendary</option>
                </select>
              </label>
              <label className="full">
                Description
                <textarea value={badgeDescription} onChange={(event) => setBadgeDescription(event.target.value)} />
              </label>
              <button className="secondary-button full" disabled={working}>
                Add streak badge level
              </button>
            </form>
          </section>
        </div>
      )}

      {selectedSeries && (
        <div className="admin-two-column">
          <section className="admin-card">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow red">Calendar</p>
                <h2>Scheduled weeks</h2>
              </div>
              <span className="pill">{seriesChallenges.length}</span>
            </div>
            <div className="admin-list">
              {seriesChallenges.map((challenge) => (
                <article className="admin-list-row" key={challenge.id}>
                  <div>
                    <strong>{challenge.title}</strong>
                    <small>
                      {challenge.period_start || "No date"} · {challenge.xp_reward} XP
                    </small>
                  </div>
                  <span className={challenge.status === "published" ? "status-chip done" : "status-chip"}>
                    {challenge.status}
                  </span>
                </article>
              ))}
              {!seriesChallenges.length && <p className="muted">No weekly challenges scheduled for this series yet.</p>}
            </div>
          </section>

          <section className="admin-card">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow red">Badge Ladder</p>
                <h2>Streak levels</h2>
              </div>
              <span className="pill">{seriesRules.length}</span>
            </div>
            <div className="admin-list">
              {seriesRules.map((rule) => {
                const badge = firstRelation(rule.badges);
                return (
                  <article className="admin-list-row" key={rule.id}>
                    <div>
                      <strong>{badge?.name || "Streak badge"}</strong>
                      <small>
                        {rule.consecutive_weeks_required} consecutive weeks · {badge?.badge_tier || badge?.rarity || "badge"}
                      </small>
                    </div>
                    <span className="status-chip done">{rule.consecutive_weeks_required} wk</span>
                  </article>
                );
              })}
              {!seriesRules.length && <p className="muted">No streak badge levels configured for this series yet.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
