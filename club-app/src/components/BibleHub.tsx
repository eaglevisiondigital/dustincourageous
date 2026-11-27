import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Scripture = {
  id: string;
  reference: string;
  translation: string;
  verse_text: string;
};

type PowerVerse = {
  id: string;
  title: string;
  kid_explanation: string | null;
  say_it: string | null;
  live_it: string | null;
  give_it_away: string | null;
  memorize_xp: number;
  scripture_passages: Scripture | Scripture[] | null;
};

type ScriptureProgress = {
  power_verse_id: string;
  status: string;
  repetitions: number;
  memorized_at: string | null;
};

type DevotionalSeries = {
  id: string;
  title: string;
  description: string | null;
};

type DevotionalDay = {
  id: string;
  devotional_series_id: string;
  day_number: number;
  title: string;
  body: string;
  prayer_prompt: string | null;
  action_step: string | null;
  xp_reward: number;
  scripture_passages: Scripture | Scripture[] | null;
};

type DevotionalProgress = {
  devotional_day_id: string;
  status: string;
  completed_at: string | null;
};

type IdentityTruth = {
  id: string;
  title: string;
  identity_statement: string;
  explanation: string | null;
  say_it: string | null;
  scripture_passages: Scripture | Scripture[] | null;
};

type IdentityProgress = {
  identity_truth_id: string;
  learned: boolean;
  favorited: boolean;
};

type PrayerPrompt = {
  id: string;
  title: string;
  category: string;
  prompt_text: string;
  xp_reward: number;
  scripture_passages: Scripture | Scripture[] | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function BibleHub({
  childId,
  childName,
  onProgress
}: {
  childId: string;
  childName: string;
  onProgress: () => Promise<void>;
}) {
  const [section, setSection] = useState<"power" | "memory" | "devotionals" | "identity" | "prayer">("power");
  const [powerVerses, setPowerVerses] = useState<PowerVerse[]>([]);
  const [scriptureProgress, setScriptureProgress] = useState<ScriptureProgress[]>([]);
  const [series, setSeries] = useState<DevotionalSeries[]>([]);
  const [days, setDays] = useState<DevotionalDay[]>([]);
  const [devotionalProgress, setDevotionalProgress] = useState<DevotionalProgress[]>([]);
  const [identityTruths, setIdentityTruths] = useState<IdentityTruth[]>([]);
  const [identityProgress, setIdentityProgress] = useState<IdentityProgress[]>([]);
  const [prayers, setPrayers] = useState<PrayerPrompt[]>([]);
  const [completedPrayerIds, setCompletedPrayerIds] = useState<Set<string>>(new Set());
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");

    const [
      powerResult,
      scriptureProgressResult,
      seriesResult,
      daysResult,
      devotionalProgressResult,
      identityResult,
      identityProgressResult,
      prayerResult,
      prayerProgressResult
    ] = await Promise.all([
      supabase
        .from("power_verses")
        .select("id,title,kid_explanation,say_it,live_it,give_it_away,memorize_xp,scripture_passages(id,reference,translation,verse_text)")
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("child_scripture_progress")
        .select("power_verse_id,status,repetitions,memorized_at")
        .eq("child_profile_id", childId),
      supabase
        .from("devotional_series")
        .select("id,title,description")
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("devotional_days")
        .select("id,devotional_series_id,day_number,title,body,prayer_prompt,action_step,xp_reward,scripture_passages(id,reference,translation,verse_text)")
        .order("day_number", { ascending: true }),
      supabase
        .from("child_devotional_progress")
        .select("devotional_day_id,status,completed_at")
        .eq("child_profile_id", childId),
      supabase
        .from("identity_truths")
        .select("id,title,identity_statement,explanation,say_it,scripture_passages(id,reference,translation,verse_text)")
        .eq("status", "published")
        .order("sort_order", { ascending: true }),
      supabase
        .from("child_identity_progress")
        .select("identity_truth_id,learned,favorited")
        .eq("child_profile_id", childId),
      supabase
        .from("prayer_prompts")
        .select("id,title,category,prompt_text,xp_reward,scripture_passages(id,reference,translation,verse_text)")
        .eq("status", "published")
        .order("created_at", { ascending: true }),
      supabase
        .from("child_prayer_progress")
        .select("prayer_prompt_id")
        .eq("child_profile_id", childId)
    ]);

    const firstError =
      powerResult.error ||
      scriptureProgressResult.error ||
      seriesResult.error ||
      daysResult.error ||
      devotionalProgressResult.error ||
      identityResult.error ||
      identityProgressResult.error ||
      prayerResult.error ||
      prayerProgressResult.error;

    if (firstError) {
      setError(firstError.message);
      return;
    }

    setPowerVerses((powerResult.data ?? []) as PowerVerse[]);
    setScriptureProgress((scriptureProgressResult.data ?? []) as ScriptureProgress[]);
    setSeries((seriesResult.data ?? []) as DevotionalSeries[]);
    setDays((daysResult.data ?? []) as DevotionalDay[]);
    setDevotionalProgress((devotionalProgressResult.data ?? []) as DevotionalProgress[]);
    setIdentityTruths((identityResult.data ?? []) as IdentityTruth[]);
    setIdentityProgress((identityProgressResult.data ?? []) as IdentityProgress[]);
    setPrayers((prayerResult.data ?? []) as PrayerPrompt[]);
    setCompletedPrayerIds(new Set((prayerProgressResult.data ?? []).map((row) => row.prayer_prompt_id)));
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  const featuredPowerVerse = powerVerses[0] ?? null;

  const progressByVerse = useMemo(
    () => new Map(scriptureProgress.map((item) => [item.power_verse_id, item])),
    [scriptureProgress]
  );

  const progressByDay = useMemo(
    () => new Map(devotionalProgress.map((item) => [item.devotional_day_id, item])),
    [devotionalProgress]
  );

  const progressByIdentity = useMemo(
    () => new Map(identityProgress.map((item) => [item.identity_truth_id, item])),
    [identityProgress]
  );

  async function markVerseLearning(powerVerseId: string) {
    setWorkingId(powerVerseId);
    setError("");

    const current = progressByVerse.get(powerVerseId);
    const { error: saveError } = await supabase
      .from("child_scripture_progress")
      .upsert(
        {
          child_profile_id: childId,
          power_verse_id: powerVerseId,
          status: current?.status === "memorized" ? "memorized" : "learning",
          repetitions: (current?.repetitions ?? 0) + 1,
          started_at: current ? undefined : new Date().toISOString(),
          last_reviewed_at: new Date().toISOString()
        },
        { onConflict: "child_profile_id,power_verse_id" }
      );

    setWorkingId(null);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    await load();
  }

  async function memorizeVerse(powerVerseId: string) {
    setWorkingId(powerVerseId);
    setError("");

    const current = progressByVerse.get(powerVerseId);
    const { error: saveError } = await supabase
      .from("child_scripture_progress")
      .upsert(
        {
          child_profile_id: childId,
          power_verse_id: powerVerseId,
          status: "memorized",
          repetitions: Math.max(1, current?.repetitions ?? 0),
          started_at: current ? undefined : new Date().toISOString(),
          last_reviewed_at: new Date().toISOString(),
          memorized_at: current?.memorized_at ?? new Date().toISOString()
        },
        { onConflict: "child_profile_id,power_verse_id" }
      );

    setWorkingId(null);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    await load();
    await onProgress();
  }

  async function completeDevotional(day: DevotionalDay) {
    setWorkingId(day.id);
    setError("");

    const existing = progressByDay.get(day.id);
    const { error: saveError } = await supabase
      .from("child_devotional_progress")
      .upsert(
        {
          child_profile_id: childId,
          devotional_day_id: day.id,
          status: "completed",
          started_at: existing ? undefined : new Date().toISOString(),
          completed_at: existing?.completed_at ?? new Date().toISOString()
        },
        { onConflict: "child_profile_id,devotional_day_id" }
      );

    setWorkingId(null);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    await load();
    await onProgress();
  }

  async function completePrayer(prayer: PrayerPrompt) {
    if (completedPrayerIds.has(prayer.id)) return;

    setWorkingId(prayer.id);
    setError("");

    const { error: saveError } = await supabase
      .from("child_prayer_progress")
      .insert({
        child_profile_id: childId,
        prayer_prompt_id: prayer.id
      });

    setWorkingId(null);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    await load();
    await onProgress();
  }

  async function updateIdentity(truth: IdentityTruth, field: "learned" | "favorited") {
    setWorkingId(truth.id);
    setError("");

    const current = progressByIdentity.get(truth.id);
    const nextLearned = field === "learned" ? !current?.learned : current?.learned ?? false;
    const nextFavorited = field === "favorited" ? !current?.favorited : current?.favorited ?? false;

    const { error: saveError } = await supabase
      .from("child_identity_progress")
      .upsert(
        {
          child_profile_id: childId,
          identity_truth_id: truth.id,
          learned: nextLearned,
          favorited: nextFavorited,
          learned_at: nextLearned ? new Date().toISOString() : null
        },
        { onConflict: "child_profile_id,identity_truth_id" }
      );

    setWorkingId(null);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    await load();
  }

  return (
    <div className="bible-hub">
      <section className="bible-hero">
        <div>
          <p className="eyebrow gold">Bible</p>
          <h1>Truth for {childName}</h1>
          <p>Know what God says. Say it. Live it. Give it away.</p>
        </div>
        <div className="bible-hero-mark">✦</div>
      </section>

      <nav className="bible-tabs" aria-label="Bible sections">
        {[
          ["power", "Power Verse"],
          ["memory", "Memory"],
          ["devotionals", "Devotionals"],
          ["identity", "Who I Am"],
          ["prayer", "Prayer"]
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={section === key ? "bible-tab active" : "bible-tab"}
            onClick={() => setSection(key as typeof section)}
          >
            {label}
          </button>
        ))}
      </nav>

      {error && <div className="form-message">{error}</div>}

      {section === "power" && featuredPowerVerse && (() => {
        const scripture = firstRelation(featuredPowerVerse.scripture_passages);
        const progress = progressByVerse.get(featuredPowerVerse.id);

        return (
          <section className="power-verse-card">
            <div className="power-verse-reference">
              <span>Power Verse</span>
              <strong>{scripture?.reference}</strong>
              <small>{scripture?.translation}</small>
            </div>
            <blockquote>{scripture?.verse_text}</blockquote>
            <div className="power-verse-grid">
              <article>
                <span>What it means</span>
                <p>{featuredPowerVerse.kid_explanation}</p>
              </article>
              <article>
                <span>Say It</span>
                <p>{featuredPowerVerse.say_it}</p>
              </article>
              <article>
                <span>Live It</span>
                <p>{featuredPowerVerse.live_it}</p>
              </article>
              <article>
                <span>Give It Away</span>
                <p>{featuredPowerVerse.give_it_away}</p>
              </article>
            </div>
            <div className="bible-action-row">
              <button
                className="secondary-button"
                disabled={workingId === featuredPowerVerse.id}
                onClick={() => void markVerseLearning(featuredPowerVerse.id)}
              >
                I practiced it
              </button>
              <button
                className="primary-button compact"
                disabled={progress?.status === "memorized" || workingId === featuredPowerVerse.id}
                onClick={() => void memorizeVerse(featuredPowerVerse.id)}
              >
                {progress?.status === "memorized" ? "Memorized ✓" : `I memorized it · +${featuredPowerVerse.memorize_xp} XP`}
              </button>
            </div>
          </section>
        );
      })()}

      {section === "memory" && (
        <section className="bible-list-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow red">Scripture Memory</p>
              <h2>Build truth into your heart</h2>
            </div>
            <span className="pill">
              {scriptureProgress.filter((item) => item.status === "memorized").length} memorized
            </span>
          </div>
          <div className="memory-grid">
            {powerVerses.map((verse) => {
              const scripture = firstRelation(verse.scripture_passages);
              const progress = progressByVerse.get(verse.id);
              return (
                <article className={progress?.status === "memorized" ? "memory-card memorized" : "memory-card"} key={verse.id}>
                  <span>{scripture?.reference}</span>
                  <h3>{verse.title}</h3>
                  <p>{scripture?.verse_text}</p>
                  <div className="memory-meta">
                    <small>{progress?.repetitions ?? 0} practices</small>
                    <strong>{progress?.status === "memorized" ? "Memorized" : progress?.status === "learning" ? "Learning" : "Start"}</strong>
                  </div>
                  <div className="bible-action-row">
                    <button className="secondary-button" onClick={() => void markVerseLearning(verse.id)}>Practice</button>
                    <button
                      className="text-button small"
                      disabled={progress?.status === "memorized"}
                      onClick={() => void memorizeVerse(verse.id)}
                    >
                      Mark memorized
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {section === "devotionals" && (
        <section className="bible-list-section">
          {series.map((item) => {
            const seriesDays = days.filter((day) => day.devotional_series_id === item.id);
            const completed = seriesDays.filter((day) => progressByDay.get(day.id)?.status === "completed").length;

            return (
              <div className="devotional-series-card" key={item.id}>
                <div className="section-heading compact-heading">
                  <div>
                    <p className="eyebrow gold">Devotional Journey</p>
                    <h2>{item.title}</h2>
                    <p className="muted">{item.description}</p>
                  </div>
                  <span className="pill">{completed}/{seriesDays.length} days</span>
                </div>
                <div className="devotional-day-list">
                  {seriesDays.map((day) => {
                    const scripture = firstRelation(day.scripture_passages);
                    const progress = progressByDay.get(day.id);
                    const done = progress?.status === "completed";

                    return (
                      <article className={done ? "devotional-day complete" : "devotional-day"} key={day.id}>
                        <div className="day-number">{done ? "✓" : day.day_number}</div>
                        <div>
                          <span>{scripture?.reference}</span>
                          <h3>{day.title}</h3>
                          <p>{day.body}</p>
                          {day.prayer_prompt && <div className="devotional-callout"><strong>Pray:</strong> {day.prayer_prompt}</div>}
                          {day.action_step && <div className="devotional-callout"><strong>Do:</strong> {day.action_step}</div>}
                        </div>
                        <button
                          className={done ? "status-chip done" : "secondary-button"}
                          disabled={done || workingId === day.id}
                          onClick={() => void completeDevotional(day)}
                        >
                          {done ? "Completed" : `Complete · +${day.xp_reward} XP`}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {section === "identity" && (
        <section className="bible-list-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow red">What God Says About Me</p>
              <h2>Identity Truths</h2>
            </div>
          </div>
          <div className="identity-truth-grid">
            {identityTruths.map((truth) => {
              const scripture = firstRelation(truth.scripture_passages);
              const progress = progressByIdentity.get(truth.id);

              return (
                <article className={progress?.learned ? "identity-truth-card learned" : "identity-truth-card"} key={truth.id}>
                  <span>{scripture?.reference}</span>
                  <h3>{truth.identity_statement}</h3>
                  <p>{truth.explanation}</p>
                  <blockquote>{scripture?.verse_text}</blockquote>
                  {truth.say_it && <div className="identity-say-it">Say it: {truth.say_it}</div>}
                  <div className="bible-action-row">
                    <button className="secondary-button" onClick={() => void updateIdentity(truth, "learned")}>
                      {progress?.learned ? "Learned ✓" : "I learned this"}
                    </button>
                    <button className="text-button small" onClick={() => void updateIdentity(truth, "favorited")}>
                      {progress?.favorited ? "★ Favorite" : "☆ Favorite"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {section === "prayer" && (
        <section className="bible-list-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow gold">Prayer</p>
              <h2>Talk with God</h2>
            </div>
            <span className="pill sentence-pill">No private prayer text is stored</span>
          </div>
          <div className="prayer-grid">
            {prayers.map((prayer) => {
              const scripture = firstRelation(prayer.scripture_passages);
              const done = completedPrayerIds.has(prayer.id);

              return (
                <article className={done ? "prayer-card complete" : "prayer-card"} key={prayer.id}>
                  <span>{prayer.category}</span>
                  <h3>{prayer.title}</h3>
                  <p>{prayer.prompt_text}</p>
                  {scripture && <small>{scripture.reference}</small>}
                  <button
                    className={done ? "status-chip done" : "primary-button compact"}
                    disabled={done || workingId === prayer.id}
                    onClick={() => void completePrayer(prayer)}
                  >
                    {done ? "Completed ✓" : `I prayed · +${prayer.xp_reward} XP`}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
