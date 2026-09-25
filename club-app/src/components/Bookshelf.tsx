import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { readBookAdventure, saveBookStatus, finishBookAdventure, completeBookStep } from "../lib/bookActions";
import { DigitalBookEntry } from "./DigitalBookReader";

type Book = {
  id: string;
  book_number: number | null;
  title: string;
  subtitle: string | null;
  slug: string;
  description: string | null;
  cover_asset_key: string | null;
  release_date: string | null;
  status: string;
  completion_xp: number;
};

type BookProgress = {
  book_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  adventure_completed_at: string | null;
};

type AdventureStep = {
  step_type: string;
  source_id: string;
  title: string;
  subtitle: string | null;
  sort_group: number;
  sort_order: number;
  is_required: boolean;
  completed: boolean;
  status: string;
  xp_reward: number;
};

type AdventureSummary = {
  total_steps: number;
  required_steps: number;
  completed_steps: number;
  completed_required_steps: number;
  progress_percent: number;
  ready_for_adventure_completion: boolean;
};

type PowerVerseLink = {
  book_id: string;
  power_verses:
    | {
        id: string;
        title: string;
        kid_explanation: string | null;
        scripture_passages:
          | { reference: string; translation: string; verse_text: string }
          | { reference: string; translation: string; verse_text: string }[]
          | null;
      }
    | {
        id: string;
        title: string;
        kid_explanation: string | null;
        scripture_passages:
          | { reference: string; translation: string; verse_text: string }
          | { reference: string; translation: string; verse_text: string }[]
          | null;
      }[]
    | null;
};

type DevotionalLink = {
  book_id: string;
  devotional_series:
    | { id: string; title: string; description: string | null }
    | { id: string; title: string; description: string | null }[]
    | null;
};

type PrayerLink = {
  book_id: string;
  prayer_prompts:
    | { id: string; title: string; prompt_text: string }
    | { id: string; title: string; prompt_text: string }[]
    | null;
};

type IdentityLink = {
  book_id: string;
  identity_truths:
    | { id: string; title: string; identity_statement: string }
    | { id: string; title: string; identity_statement: string }[]
    | null;
};

type ChallengeLink = {
  book_id: string;
  challenges:
    | { id: string; title: string; description: string | null; xp_reward: number }
    | { id: string; title: string; description: string | null; xp_reward: number }[]
    | null;
};

type ContentLink = {
  book_id: string;
  relationship_type: string;
  content_items:
    | { id: string; title: string; summary: string | null; content_type: string; asset_key: string | null }
    | { id: string; title: string; summary: string | null; content_type: string; asset_key: string | null }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function coverUrl(assetKey: string | null) {
  if (!assetKey) return "https://dustincourageous.com/assets/images/dc-shield.jpeg";
  if (assetKey.startsWith("http")) return assetKey;
  return `https://dustincourageous.com/assets/images/${assetKey}`;
}

export function Bookshelf({
  childId,
  childName,
  onProgress,
  onOpenChallenge,
  onOpenBible,
  onOpenActivities
}: {
  childId: string;
  childName: string;
  onProgress: () => Promise<void>;
  onOpenChallenge: (challengeId: string) => void;
  onOpenBible: () => void;
  onOpenActivities: () => void;
}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<BookProgress[]>([]);
  const [bookAccess, setBookAccess] = useState<Record<string, boolean>>({});
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [powerLinks, setPowerLinks] = useState<PowerVerseLink[]>([]);
  const [devotionalLinks, setDevotionalLinks] = useState<DevotionalLink[]>([]);
  const [prayerLinks, setPrayerLinks] = useState<PrayerLink[]>([]);
  const [identityLinks, setIdentityLinks] = useState<IdentityLink[]>([]);
  const [challengeLinks, setChallengeLinks] = useState<ChallengeLink[]>([]);
  const [contentLinks, setContentLinks] = useState<ContentLink[]>([]);
  const [adventureSteps, setAdventureSteps] = useState<AdventureStep[]>([]);
  const [adventureSummary, setAdventureSummary] = useState<AdventureSummary | null>(null);
  const [working, setWorking] = useState(false);
  const [stepWorking, setStepWorking] = useState("");
  const [error, setError] = useState("");

  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [adventureLoading,setAdventureLoading]=useState(false);
  const [adventureError,setAdventureError]=useState("");
  const loadVersion=useRef(0);
  const adventureVersion=useRef(0);
  const actionBusy=useRef(false);

  const load = useCallback(async () => {
    const version=++loadVersion.current;
    setLoading(true);setLoadError("");
    try {

    const [
      booksResult,
      progressResult,
      powerResult,
      devotionalResult,
      prayerResult,
      identityResult,
      challengeResult,
      contentResult
    ] = await Promise.all([
      supabase
        .from("books")
        .select("id,book_number,title,subtitle,slug,description,cover_asset_key,release_date,status,completion_xp")
        .in("status", ["coming_soon", "published"])
        .order("book_number", { ascending: true }),
      supabase
        .from("child_book_progress")
        .select("book_id,status,started_at,completed_at,adventure_completed_at")
        .eq("child_profile_id", childId),
      supabase
        .from("book_power_verses")
        .select("book_id,power_verses(id,title,kid_explanation,scripture_passages(reference,translation,verse_text))")
        .order("sort_order", { ascending: true }),
      supabase
        .from("book_devotional_series")
        .select("book_id,devotional_series(id,title,description)")
        .order("sort_order", { ascending: true }),
      supabase
        .from("book_prayer_prompts")
        .select("book_id,prayer_prompts(id,title,prompt_text)")
        .order("sort_order", { ascending: true }),
      supabase
        .from("book_identity_truths")
        .select("book_id,identity_truths(id,title,identity_statement)")
        .order("sort_order", { ascending: true }),
      supabase
        .from("book_challenges")
        .select("book_id,challenges(id,title,description,xp_reward)")
        .order("sort_order", { ascending: true }),
      supabase
        .from("book_content_links")
        .select("book_id,relationship_type,content_items(id,title,summary,content_type,asset_key)")
        .order("sort_order", { ascending: true })
    ]);

    const firstError =
      booksResult.error ||
      progressResult.error ||
      powerResult.error ||
      devotionalResult.error ||
      prayerResult.error ||
      identityResult.error ||
      challengeResult.error ||
      contentResult.error;

    if (firstError) throw firstError;

    const nextBooks = (booksResult.data ?? []) as Book[];
    const accessResults = await Promise.all(
      nextBooks.map((book) => supabase.rpc("has_book_access", { p_book_id: book.id }))
    );
    const accessError = accessResults.find((result) => result.error)?.error;
    if (accessError) throw accessError;
    if(accessResults.some(result=>typeof result.data!=="boolean"))throw new Error("Book access could not be confirmed.");
    if(version!==loadVersion.current)return;

    setBooks(nextBooks);
    setBookAccess(Object.fromEntries(nextBooks.map((book, index) => [book.id, accessResults[index].data === true])));
    setProgress((progressResult.data ?? []) as BookProgress[]);
    setPowerLinks((powerResult.data ?? []) as PowerVerseLink[]);
    setDevotionalLinks((devotionalResult.data ?? []) as DevotionalLink[]);
    setPrayerLinks((prayerResult.data ?? []) as PrayerLink[]);
    setIdentityLinks((identityResult.data ?? []) as IdentityLink[]);
    setChallengeLinks((challengeResult.data ?? []) as ChallengeLink[]);
    setContentLinks((contentResult.data ?? []) as ContentLink[]);

    setSelectedBookId(current=>nextBooks.some(book=>book.id===current)?current:nextBooks[0]?.id??"");
    } catch {
      if(version===loadVersion.current)setLoadError("Your bookshelf could not be loaded. Please try again.");
    } finally {if(version===loadVersion.current)setLoading(false);}
  }, [childId]);

  useEffect(() => {
    void load();
    return ()=>{loadVersion.current++;};
  }, [load]);

  const progressByBook = useMemo(
    () => new Map(progress.map((item) => [item.book_id, item])),
    [progress]
  );

  const selectedBook = books.find((book) => book.id === selectedBookId) ?? books[0] ?? null;
  const selectedHasAccess = selectedBook ? bookAccess[selectedBook.id] === true : false;
  const selectedProgress = selectedBook ? progressByBook.get(selectedBook.id) : undefined;
  const selectedBookCompleted = ["completed", "adventure_completed"].includes(selectedProgress?.status ?? "");

  const selectedPowerVerse = selectedBook
    ? firstRelation(powerLinks.find((item) => item.book_id === selectedBook.id)?.power_verses ?? null)
    : null;
  const selectedDevotional = selectedBook
    ? firstRelation(devotionalLinks.find((item) => item.book_id === selectedBook.id)?.devotional_series ?? null)
    : null;
  const selectedPrayer = selectedBook
    ? firstRelation(prayerLinks.find((item) => item.book_id === selectedBook.id)?.prayer_prompts ?? null)
    : null;
  const selectedIdentity = selectedBook
    ? firstRelation(identityLinks.find((item) => item.book_id === selectedBook.id)?.identity_truths ?? null)
    : null;
  const selectedChallenge = selectedBook
    ? firstRelation(challengeLinks.find((item) => item.book_id === selectedBook.id)?.challenges ?? null)
    : null;
  const selectedContent = selectedBook
    ? contentLinks
        .filter((item) => item.book_id === selectedBook.id)
        .map((item) => ({ relationshipType: item.relationship_type, content: firstRelation(item.content_items) }))
        .filter((item) => item.content)
    : [];

  const loadAdventure = useCallback(async () => {
    const version=++adventureVersion.current;
    setAdventureSteps([]);setAdventureSummary(null);setAdventureError("");setAdventureLoading(false);
    if(!selectedBook || !selectedHasAccess)return;
    setAdventureLoading(true);
    try {
      const result=await readBookAdventure(supabase,childId,selectedBook.id);
      if(version!==adventureVersion.current)return;
      setAdventureSteps(result.steps);setAdventureSummary(result.summary);
    } catch {
      if(version===adventureVersion.current)setAdventureError("Book Adventure progress could not be loaded. Please try again.");
    } finally {if(version===adventureVersion.current)setAdventureLoading(false);}
  }, [childId, selectedBook?.id, selectedHasAccess]);

  useEffect(() => {
    void loadAdventure();
    return ()=>{adventureVersion.current++;};
  }, [loadAdventure]);

  useEffect(() => {
    const handler = () => {
      if(actionBusy.current)return;
      void load();
      void loadAdventure();
    };
    window.addEventListener("dc-progress-updated", handler);
    return () => window.removeEventListener("dc-progress-updated", handler);
  }, [load, loadAdventure]);

  async function runBookAction(key:string,action:()=>Promise<void>) {
    if(actionBusy.current||!selectedHasAccess||adventureLoading||adventureError)return;
    actionBusy.current=true;setWorking(true);setStepWorking(key);setError("");
    let saved=false;
    try {
      await action();saved=true;
      await onProgress();
    } catch {
      setError(saved ? "Your progress was saved. The latest totals could not refresh yet." : "Progress could not be confirmed. Refresh the bookshelf before trying again.");
    } finally {
      await Promise.all([load(),loadAdventure()]);
      if(saved)window.dispatchEvent(new Event("dc-progress-updated"));
      actionBusy.current=false;setWorking(false);setStepWorking("");
    }
  }

  async function completeSimpleStep(step: AdventureStep) {
    if(step.completed)return;
    await runBookAction(step.step_type+":"+step.source_id,()=>completeBookStep(supabase,childId,step.step_type,step.source_id));
  }

  async function finishFullAdventure() {
    if(!selectedBook||!adventureSummary?.ready_for_adventure_completion||selectedProgress?.status==="adventure_completed")return;
    await runBookAction("finish",()=>finishBookAdventure(supabase,childId,selectedBook.id));
  }

  function stepAction(step: AdventureStep) {
    if (step.completed) return null;

    if (step.step_type === "book") {
      return (
        <button type="button" className="secondary-button" disabled={working} onClick={() => void setBookStatus("completed")}>
          Mark book complete
        </button>
      );
    }

    if (step.step_type === "power_verse" || step.step_type === "devotional") {
      return (
        <button type="button" className="secondary-button" onClick={onOpenBible}>
          Go to Bible
        </button>
      );
    }

    if (step.step_type === "activity") {
      return (
        <button type="button" className="secondary-button" onClick={onOpenActivities}>
          Open Activities
        </button>
      );
    }

    if (step.step_type === "challenge") {
      return (
        <button type="button" className="secondary-button" onClick={() => onOpenChallenge(step.source_id)}>
          Open Challenge
        </button>
      );
    }

    if (step.step_type === "identity") {
      return (
        <button
          type="button"
          className="secondary-button"
          disabled={working || adventureLoading || !!adventureError}
          onClick={() => void completeSimpleStep(step)}
        >
          {stepWorking === step.step_type + ":" + step.source_id ? "Saving..." : "I learned this truth"}
        </button>
      );
    }

    if (step.step_type === "prayer") {
      return (
        <button
          type="button"
          className="secondary-button"
          disabled={working || adventureLoading || !!adventureError}
          onClick={() => void completeSimpleStep(step)}
        >
          {stepWorking === step.step_type + ":" + step.source_id ? "Saving..." : "I prayed this"}
        </button>
      );
    }

    return null;
  }

  async function setBookStatus(status: "reading" | "completed") {
    if(!selectedBook)return;
    await runBookAction(status,()=>saveBookStatus(supabase,childId,selectedBook.id,status));
  }

  if(loading)return <section className="bookshelf" aria-busy="true"><p role="status">Loading your bookshelf...</p></section>;
  if(loadError)return <section className="bookshelf"><p role="alert">{loadError}</p><button className="secondary-button" disabled={working} onClick={()=>void load()}>Try again</button></section>;

  return (
    <div className="bookshelf">
      <section className="bookshelf-hero">
        <div>
          <p className="eyebrow red">Books</p>
          <h1>{childName}'s Adventure Bookshelf</h1>
          <p>Read the story. Discover the truth. Take the challenge. Keep the adventure going.</p>
        </div>
        <div className="bookshelf-count">
          <strong>{books.length}</strong>
          <span>Book{books.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      {error && <div className="form-message" role="status">{error}</div>}
      {!books.length&&<p className="muted">Books will appear here when they are available.</p>}

      <section className="book-shelf-row">
        {books.map((book) => {
          const bookProgress = progressByBook.get(book.id);
          return (
            <button
              type="button"
              key={book.id}
              className={selectedBook?.id === book.id ? "book-spine-card active" : "book-spine-card"}
              disabled={working}
              aria-pressed={selectedBook?.id===book.id}
              onClick={() => {
                if(actionBusy.current||book.id===selectedBookId)return;
                adventureVersion.current++;setAdventureSteps([]);setAdventureSummary(null);setAdventureError("");setAdventureLoading(true);
                setSelectedBookId(book.id);
              }}
            >
              <img src={coverUrl(book.cover_asset_key)} alt={book.title} />
              <span>Book #{book.book_number ?? ""}</span>
              <strong>{book.title}</strong>
              <small>
                {bookProgress?.status === "adventure_completed"
                  ? "Full Adventure ✓"
                  : bookProgress?.status === "completed"
                    ? "Completed ✓"
                  : bookProgress?.status === "reading"
                    ? "Reading"
                    : book.status === "coming_soon"
                      ? "Coming Soon"
                      : "Ready"}
              </small>
            </button>
          );
        })}
      </section>

      {selectedBook && (
        <section className="book-companion">
          <div className="book-companion-cover">
            <img src={coverUrl(selectedBook.cover_asset_key)} alt={selectedBook.title} />
          </div>
          <div className="book-companion-content">
            <p className="eyebrow gold">Book #{selectedBook.book_number ?? ""}</p>
            <h2>{selectedBook.title}</h2>
            {selectedBook.subtitle && <h3>{selectedBook.subtitle}</h3>}
            <p className="muted">{selectedBook.description}</p>

            <div className="book-status-row">
              <span className="pill">
                {!selectedHasAccess
                  ? "Companion access required"
                  : selectedProgress?.status === "adventure_completed"
                  ? "Full Adventure completed"
                  : selectedProgress?.status === "completed"
                    ? "Completed"
                  : selectedProgress?.status === "reading"
                    ? "Currently reading"
                    : selectedBook.status === "coming_soon"
                      ? "Coming soon"
                      : "Ready to read"}
              </span>
              {selectedBook.release_date && (
                <small>Release {new Date(selectedBook.release_date + "T12:00:00").toLocaleDateString()}</small>
              )}
            </div>

            <DigitalBookEntry key={childId + ":" + selectedBook.id} childId={childId} bookId={selectedBook.id} title={selectedBook.title} />
            <div className="book-progress-actions">
              <button
                className="secondary-button"
                disabled={!selectedHasAccess || working || adventureLoading || !!adventureError || selectedProgress?.status === "reading" || selectedBookCompleted}
                onClick={() => void setBookStatus("reading")}
              >
                {selectedProgress?.status === "reading" || selectedBookCompleted
                  ? "Reading started ✓"
                  : "Start reading"}
              </button>
              <button
                className="primary-button compact"
                disabled={!selectedHasAccess || working || adventureLoading || !!adventureError || selectedBookCompleted}
                onClick={() => void setBookStatus("completed")}
              >
                {selectedBookCompleted
                  ? "Book completed ✓"
                  : `I finished the book · +${selectedBook.completion_xp} XP`}
              </button>
            </div>

            {!selectedHasAccess && (
              <div className="form-message">
                This Book Companion is locked for this family. A guardian can unlock it through membership, a book purchase, a gift, or a bundle.
              </div>
            )}
            {selectedHasAccess && (
              <>
            <section className="book-adventure-path">
              <div className="book-adventure-heading">
                <div>
                  <p className="eyebrow red">Full Book Adventure</p>
                  <h3>Keep the story going</h3>
                  <p>
                    Complete the required steps connected to this book to finish your full Book Adventure.
                  </p>
                </div>
                {adventureSummary && (
                  <div className="book-adventure-score">
                    <strong>{adventureSummary.progress_percent}%</strong>
                    <span>{adventureSummary.completed_required_steps}/{adventureSummary.required_steps} required</span>
                  </div>
                )}
              </div>

              {adventureSummary && (
                <div className="level-progress-track book-adventure-meter">
                  <span style={{width: adventureSummary.progress_percent + "%"}} />
                </div>
              )}

              {adventureLoading&&<p role="status">Loading adventure steps...</p>}
              {adventureError&&<div className="form-message" role="alert">{adventureError} <button className="text-button" disabled={working} onClick={()=>void loadAdventure()}>Try again</button></div>}
              <div className="book-adventure-steps">
                {adventureSteps.map((step) => (
                  <article className={step.completed ? "book-adventure-step complete" : "book-adventure-step"} key={step.step_type + ":" + step.source_id}>
                    <span className="book-step-icon">{step.completed ? "✓" : step.sort_group === 0 ? "1" : "◆"}</span>
                    <div>
                      <small>{step.step_type.replaceAll("_"," ")}{step.is_required ? " · required" : " · optional"}</small>
                      <strong>{step.title}</strong>
                      {step.subtitle && <p>{step.subtitle}</p>}
                      {step.xp_reward > 0 && <em>+{step.xp_reward} XP</em>}
                    </div>
                    <div className="book-step-action">
                      {step.completed ? <span className="status-chip done">Complete</span> : stepAction(step)}
                    </div>
                  </article>
                ))}
              </div>

              <button
                type="button"
                className="primary-button book-adventure-finish"
                disabled={!selectedHasAccess || working || adventureLoading || !!adventureError || !adventureSummary?.ready_for_adventure_completion || stepWorking === "finish" || selectedProgress?.status === "adventure_completed"}
                onClick={() => void finishFullAdventure()}
              >
                {selectedProgress?.status === "adventure_completed"
                  ? "Full Book Adventure Completed ✓"
                  : stepWorking === "finish"
                    ? "Completing..."
                    : adventureSummary?.ready_for_adventure_completion
                      ? "Complete Full Book Adventure"
                      : "Finish the required steps to unlock"}
              </button>
            </section>

            <div className="book-companion-grid">
              {selectedPowerVerse && (() => {
                const scripture = firstRelation(selectedPowerVerse.scripture_passages);
                return (
                  <article>
                    <span>Power Verse</span>
                    <h3>{scripture?.reference}</h3>
                    <p>{scripture?.verse_text}</p>
                  </article>
                );
              })()}

              {selectedIdentity && (
                <article>
                  <span>Identity Truth</span>
                  <h3>{selectedIdentity.identity_statement}</h3>
                  <p>{selectedIdentity.title}</p>
                </article>
              )}

              {selectedDevotional && (
                <article>
                  <span>Devotional</span>
                  <h3>{selectedDevotional.title}</h3>
                  <p>{selectedDevotional.description}</p>
                </article>
              )}

              {selectedPrayer && (
                <article>
                  <span>Prayer</span>
                  <h3>{selectedPrayer.title}</h3>
                  <p>{selectedPrayer.prompt_text}</p>
                </article>
              )}

              {selectedChallenge && (
                <article className="book-challenge-card">
                  <span>Courage Challenge</span>
                  <h3>{selectedChallenge.title}</h3>
                  <p>{selectedChallenge.description}</p>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => onOpenChallenge(selectedChallenge.id)}
                  >
                    Open challenge · +{selectedChallenge.xp_reward} XP
                  </button>
                </article>
              )}

              {selectedContent.map(({ relationshipType, content }) => (
                <article key={content!.id}>
                  <span>{relationshipType.replaceAll("_", " ")}</span>
                  <h3>{content!.title}</h3>
                  <p>{content!.summary}</p>
                  <small>{content!.content_type}</small>
                </article>
              ))}
            </div>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
