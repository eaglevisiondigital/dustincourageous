import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Book = {
  id: string;
  book_number: number | null;
  title: string;
  cover_asset_key: string | null;
};

type AdventureStep = {
  step_type: string;
  source_id: string;
  title: string;
  subtitle: string | null;
  is_required: boolean;
  completed: boolean;
  status: string;
};

type AdventureSummary = {
  required_steps: number;
  completed_required_steps: number;
  progress_percent: number;
  ready_for_adventure_completion: boolean;
};

type PowerVerse = {
  id: string;
  title: string;
  kid_explanation: string | null;
  scripture_passages:
    | { reference: string; translation: string; verse_text: string }
    | { reference: string; translation: string; verse_text: string }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function coverUrl(assetKey: string | null) {
  if (!assetKey) return "https://dustincourageous.com/assets/images/dc-shield.jpeg";
  if (assetKey.startsWith("http")) return assetKey;
  return "https://dustincourageous.com/assets/images/" + assetKey;
}

export function KidHomeFocus({
  childId,
  onOpenBooks,
  onOpenBible,
  onOpenActivities,
  onOpenChallenge
}: {
  childId: string;
  onOpenBooks: () => void;
  onOpenBible: () => void;
  onOpenActivities: () => void;
  onOpenChallenge: (challengeId: string) => void;
}) {
  const [book, setBook] = useState<Book | null>(null);
  const [summary, setSummary] = useState<AdventureSummary | null>(null);
  const [bookProgressStatus, setBookProgressStatus] = useState<string | null>(null);
  const [hasBookAccess, setHasBookAccess] = useState(false);
  const [steps, setSteps] = useState<AdventureStep[]>([]);
  const [powerVerse, setPowerVerse] = useState<PowerVerse | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");

    const [bookResult, verseResult] = await Promise.all([
      supabase
        .from("books")
        .select("id,book_number,title,cover_asset_key")
        .in("status", ["coming_soon", "published"])
        .order("book_number", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("power_verses")
        .select("id,title,kid_explanation,scripture_passages(reference,translation,verse_text)")
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()
    ]);

    const firstError = bookResult.error || verseResult.error;
    if (firstError) {
      setError(firstError.message);
      return;
    }

    const nextBook = (bookResult.data ?? null) as Book | null;
    setBook(nextBook);
    setPowerVerse((verseResult.data ?? null) as PowerVerse | null);

    if (!nextBook) {
      setSummary(null);
      setSteps([]);
      setBookProgressStatus(null);
      setHasBookAccess(false);
      return;
    }

    const [summaryResult, stepsResult, progressResult, accessResult] = await Promise.all([
      supabase.rpc("get_child_book_adventure_summary", {
        p_child_profile_id: childId,
        p_book_id: nextBook.id
      }),
      supabase.rpc("get_child_book_adventure_steps", {
        p_child_profile_id: childId,
        p_book_id: nextBook.id
      }),
      supabase.from("child_book_progress").select("status")
        .eq("child_profile_id", childId).eq("book_id", nextBook.id).maybeSingle(),
      (supabase as any).rpc("has_book_access", { p_book_id: nextBook.id })
    ]);

    if (summaryResult.error || stepsResult.error || progressResult.error || accessResult.error) {
      setError(summaryResult.error?.message || stepsResult.error?.message || progressResult.error?.message || accessResult.error?.message || "Unable to load adventure.");
      return;
    }

    setSummary(((summaryResult.data ?? [])[0] ?? null) as AdventureSummary | null);
    setSteps((stepsResult.data ?? []) as AdventureStep[]);
    setBookProgressStatus(progressResult.data?.status ?? null);
    setHasBookAccess(accessResult.data === true);
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => void load();
    window.addEventListener("dc-progress-updated", handler);
    return () => window.removeEventListener("dc-progress-updated", handler);
  }, [load]);

  const nextStep = useMemo(
    () => !hasBookAccess || bookProgressStatus === "adventure_completed" ? null : steps.find((step) => step.is_required && !step.completed) ?? null,
    [steps, bookProgressStatus, hasBookAccess]
  );

  function openNext() {
    if (!nextStep) {
      onOpenBooks();
      return;
    }

    if (nextStep.step_type === "power_verse" || nextStep.step_type === "devotional") {
      onOpenBible();
      return;
    }

    if (nextStep.step_type === "activity") {
      onOpenActivities();
      return;
    }

    if (nextStep.step_type === "challenge") {
      onOpenChallenge(nextStep.source_id);
      return;
    }

    onOpenBooks();
  }

  return (
    <section className="kid-home-focus">
      {error && <div className="form-message">{error}</div>}

      <article className="continue-adventure-card">
        <div className="continue-book-cover">
          {book && <img src={coverUrl(book.cover_asset_key)} alt={book.title} />}
        </div>
        <div className="continue-adventure-copy">
          <p className="eyebrow red">{!hasBookAccess ? "Book Companion" : bookProgressStatus === "adventure_completed" ? "Adventure Complete" : "Continue Adventure"}</p>
          <h2>{book ? "Book #" + (book.book_number ?? "") + ": " + book.title : "Your next adventure"}</h2>
          {!hasBookAccess ? (
            <p>This companion is ready to unlock through your family's membership, book purchase, gift, or bundle.</p>
          ) : summary ? (
            <>
              <p>
                {summary.completed_required_steps} of {summary.required_steps} required steps complete.
                {bookProgressStatus === "adventure_completed" ? " Full Book Adventure completed!" : nextStep ? " Next: " + nextStep.title + "." : " You are ready to finish the full Book Adventure!"}
              </p>
              <div className="level-progress-track continue-adventure-meter">
                <span style={{width: summary.progress_percent + "%"}} />
              </div>
              <div className="continue-adventure-meta">
                <strong>{summary.progress_percent}%</strong>
                <span>{bookProgressStatus === "adventure_completed" ? "adventure complete" : nextStep ? nextStep.step_type.replaceAll("_"," ") : "ready to complete"}</span>
              </div>
            </>
          ) : (
            <p>Start Book #1 and build your adventure one step at a time.</p>
          )}
          <button className="primary-button" type="button" onClick={openNext}>
            {nextStep ? "Continue: " + nextStep.title : "Open Bookshelf"}
          </button>
        </div>
      </article>

      {powerVerse && (() => {
        const scripture = firstRelation(powerVerse.scripture_passages);
        return (
          <article className="featured-power-card">
            <div className="featured-power-icon">◆</div>
            <div>
              <p className="eyebrow gold">Power Verse</p>
              <h3>{scripture?.reference || powerVerse.title}</h3>
              <blockquote>{scripture?.verse_text}</blockquote>
              {powerVerse.kid_explanation && <p>{powerVerse.kid_explanation}</p>}
              <button className="secondary-button" type="button" onClick={onOpenBible}>
                Practice this Power Verse
              </button>
            </div>
          </article>
        );
      })()}
    </section>
  );
}
