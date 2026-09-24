import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type ChildSummary = {
  child_profile_id: string;
  household_id: string;
  display_name: string;
  total_xp: number;
  weekly_stars: number;
  lifetime_badges: number;
  completed_challenges: number;
  verses_memorized: number;
  devotional_days_completed: number;
  books_completed: number;
  unlocked_rewards: number;
};

type BookRow = {
  id: string;
  book_number: number | null;
  title: string;
};

type BookAdventureSummary = {
  total_steps: number;
  required_steps: number;
  completed_steps: number;
  completed_required_steps: number;
  progress_percent: number;
  ready_for_adventure_completion: boolean;
};

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

  const load = useCallback(async () => {
    setError("");

    const [summaryResult, bookResult] = await Promise.all([
      supabase
        .from("parent_child_progress_summary")
        .select("*")
        .eq("household_id", householdId)
        .order("display_name", { ascending: true }),
      supabase
        .from("books")
        .select("id,book_number,title")
        .in("status", ["coming_soon", "published"])
        .order("book_number", { ascending: true })
        .limit(1)
        .maybeSingle()
    ]);

    const firstError = summaryResult.error || bookResult.error;
    if (firstError) {
      setError(firstError.message);
      return;
    }

    const nextSummaries = (summaryResult.data ?? []) as ChildSummary[];
    const nextBook = (bookResult.data ?? null) as BookRow | null;
    setSummaries(nextSummaries);
    setPrimaryBook(nextBook);

    if (!nextBook || !nextSummaries.length) {
      setBookProgress({});
      return;
    }

    const resultPairs = await Promise.all(
      nextSummaries.map(async (child) => {
        const { data, error } = await supabase.rpc("get_child_book_adventure_summary", {
          p_child_profile_id: child.child_profile_id,
          p_book_id: nextBook.id
        });

        if (error) return [child.child_profile_id, null] as const;
        return [
          child.child_profile_id,
          ((data ?? [])[0] ?? null) as BookAdventureSummary | null
        ] as const;
      })
    );

    setBookProgress(
      Object.fromEntries(
        resultPairs.filter(([, value]) => value !== null)
      ) as Record<string, BookAdventureSummary>
    );
  }, [householdId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => void load();
    window.addEventListener("dc-progress-updated", handler);
    return () => window.removeEventListener("dc-progress-updated", handler);
  }, [load]);

  const selected = useMemo(
    () => summaries.find((item) => item.child_profile_id === selectedChildId) ?? summaries[0] ?? null,
    [summaries, selectedChildId]
  );

  return (
    <section className="parent-progress-overview">
      <div className="section-heading">
        <div>
          <p className="eyebrow red">Family Progress</p>
          <h2>See what they are building</h2>
        </div>
        <span className="pill">{summaries.length} adventurer{summaries.length === 1 ? "" : "s"}</span>
      </div>

      {error && <div className="form-message">{error}</div>}

      <div className="parent-child-progress-tabs">
        {summaries.map((child) => (
          <button
            type="button"
            key={child.child_profile_id}
            className={selected?.child_profile_id === child.child_profile_id ? "parent-child-tab active" : "parent-child-tab"}
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
                  View child experience
                </button>
              </div>
            </article>
          )}
        </>
      )}
    </section>
  );
}
