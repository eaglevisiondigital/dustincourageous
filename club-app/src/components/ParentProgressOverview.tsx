import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

import { readFamilyProgress, type ChildSummary, type BookAdventureSummary } from "../lib/familyProgress";
type BookRow = { id: string; book_number: number | null; title: string; };

export function ParentProgressOverview({
  householdId,
  selectedChildId,
  onSelectChild,
  onOpenChild
}: {
  householdId: string;
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
  onOpenChild: (childId: string) => void;
}) {
  const [summaries, setSummaries] = useState<ChildSummary[]>([]);
  const [primaryBook, setPrimaryBook] = useState<BookRow | null>(null);
  const [bookProgress, setBookProgress] = useState<Record<string, BookAdventureSummary>>({});
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);
  const [bookErrors, setBookErrors] = useState<Record<string, boolean>>({});
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true); setError("");
    try {
      const result = await readFamilyProgress(supabase, householdId);
      if (version !== loadVersion.current) return;
      setSummaries(result.summaries);
      setPrimaryBook(result.book);
      setBookProgress(result.bookProgress);
      setBookErrors(result.bookErrors);
    } catch {
      if (version === loadVersion.current) setError("Family progress could not be loaded. Please try again.");
    } finally { if (version === loadVersion.current) setLoading(false); }
  }, [householdId]);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("dc-progress-updated", refresh);
    return () => {
      loadVersion.current++;
      window.removeEventListener("dc-progress-updated", refresh);
    };
  }, [load]);

  const selected = useMemo(
    () => summaries.find((item) => item.child_profile_id === selectedChildId) ?? null,
    [summaries, selectedChildId]
  );

  if (loading) return <section className="parent-progress-overview" aria-busy="true"><p role="status">Loading family progress...</p></section>;
  if (error) return <section className="parent-progress-overview"><p role="alert">{error}</p><button className="secondary-button" onClick={() => void load()}>Try Again</button></section>;

  return (
    <section className="parent-progress-overview">
      <div className="section-heading">
        <div>
          <p className="eyebrow red">Family Progress</p>
          <h2>See what they are building</h2>
        </div>
        <span className="pill">{summaries.length} adventurer{summaries.length === 1 ? "" : "s"}</span>
      </div>

      {!summaries.length && <p className="muted">No active child profiles to display.</p>}
      {summaries.length > 0 && !selected && <p className="muted">Choose a child to see their progress.</p>}

      <div className="parent-child-progress-tabs">
        {summaries.map((child) => (
          <button
            type="button"
            key={child.child_profile_id}
            className={selected?.child_profile_id === child.child_profile_id ? "parent-child-tab active" : "parent-child-tab"}
            aria-pressed={selected?.child_profile_id === child.child_profile_id}
            onClick={() => onSelectChild(child.child_profile_id)}
          >
            <span>{child.display_name.slice(0,1).toUpperCase()}</span>
            <strong>{child.display_name}</strong>
          </button>
        ))}
      </div>

      {selected && (
        <>
          <div className="parent-progress-grid">
            <article><strong>{selected.total_xp}</strong><span>XP</span></article>
            <article><strong>{selected.weekly_stars}</strong><span>Weekly Stars</span></article>
            <article><strong>{selected.lifetime_badges}</strong><span>Lifetime Badges</span></article>
            <article><strong>{selected.completed_challenges}</strong><span>Challenges</span></article>
            <article><strong>{selected.verses_memorized}</strong><span>Power Verses</span></article>
            <article><strong>{selected.devotional_days_completed}</strong><span>Devotional Days</span></article>
            <article><strong>{selected.books_completed}</strong><span>Books Completed</span></article>
            <article><strong>{selected.unlocked_rewards}</strong><span>Unlocked Rewards</span></article>
          </div>

          {primaryBook && bookErrors[selected.child_profile_id] && <div className="form-message" role="status">Book Adventure progress is unavailable for this child. <button className="text-button" onClick={() => void load()}>Retry</button></div>}
          {primaryBook && bookProgress[selected.child_profile_id] && (
            <article className="parent-book-progress-card">
              <div>
                <p className="eyebrow gold">Book #{primaryBook.book_number ?? ""} Adventure</p>
                <h3>{primaryBook.title}</h3>
                <p>
                  {bookProgress[selected.child_profile_id].completed_required_steps} of {bookProgress[selected.child_profile_id].required_steps} required steps complete.
                </p>
              </div>
              <div className="parent-book-progress-meter">
                <strong>{bookProgress[selected.child_profile_id].progress_percent}%</strong>
                <div className="level-progress-track">
                  <span style={{width: bookProgress[selected.child_profile_id].progress_percent + "%"}} />
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onOpenChild(selected.child_profile_id)}
                >
                  View Child Experience
                </button>
              </div>
            </article>
          )}
        </>
      )}
    </section>
  );
}
