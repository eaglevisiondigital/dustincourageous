import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

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
  onOpenChallenge
}: {
  childId: string;
  childName: string;
  onProgress: () => Promise<void>;
  onOpenChallenge: (challengeId: string) => void;
}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<BookProgress[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [powerLinks, setPowerLinks] = useState<PowerVerseLink[]>([]);
  const [devotionalLinks, setDevotionalLinks] = useState<DevotionalLink[]>([]);
  const [prayerLinks, setPrayerLinks] = useState<PrayerLink[]>([]);
  const [identityLinks, setIdentityLinks] = useState<IdentityLink[]>([]);
  const [challengeLinks, setChallengeLinks] = useState<ChallengeLink[]>([]);
  const [contentLinks, setContentLinks] = useState<ContentLink[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");

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

    if (firstError) {
      setError(firstError.message);
      return;
    }

    const nextBooks = (booksResult.data ?? []) as Book[];
    setBooks(nextBooks);
    setProgress((progressResult.data ?? []) as BookProgress[]);
    setPowerLinks((powerResult.data ?? []) as PowerVerseLink[]);
    setDevotionalLinks((devotionalResult.data ?? []) as DevotionalLink[]);
    setPrayerLinks((prayerResult.data ?? []) as PrayerLink[]);
    setIdentityLinks((identityResult.data ?? []) as IdentityLink[]);
    setChallengeLinks((challengeResult.data ?? []) as ChallengeLink[]);
    setContentLinks((contentResult.data ?? []) as ContentLink[]);

    if (!selectedBookId && nextBooks.length) {
      setSelectedBookId(nextBooks[0].id);
    }
  }, [childId, selectedBookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const progressByBook = useMemo(
    () => new Map(progress.map((item) => [item.book_id, item])),
    [progress]
  );

  const selectedBook = books.find((book) => book.id === selectedBookId) ?? books[0] ?? null;
  const selectedProgress = selectedBook ? progressByBook.get(selectedBook.id) : undefined;

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

  async function setBookStatus(status: "reading" | "completed") {
    if (!selectedBook) return;

    setWorking(true);
    setError("");

    const existing = progressByBook.get(selectedBook.id);
    const { error: saveError } = await supabase
      .from("child_book_progress")
      .upsert(
        {
          child_profile_id: childId,
          book_id: selectedBook.id,
          status,
          started_at: existing?.started_at ?? new Date().toISOString(),
          completed_at:
            status === "completed"
              ? existing?.completed_at ?? new Date().toISOString()
              : existing?.completed_at ?? null
        },
        { onConflict: "child_profile_id,book_id" }
      );

    setWorking(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    await load();
    if (status === "completed") await onProgress();
  }

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

      {error && <div className="form-message">{error}</div>}

      <section className="book-shelf-row">
        {books.map((book) => {
          const bookProgress = progressByBook.get(book.id);
          return (
            <button
              type="button"
              key={book.id}
              className={selectedBook?.id === book.id ? "book-spine-card active" : "book-spine-card"}
              onClick={() => setSelectedBookId(book.id)}
            >
              <img src={coverUrl(book.cover_asset_key)} alt={book.title} />
              <span>Book #{book.book_number ?? ""}</span>
              <strong>{book.title}</strong>
              <small>
                {bookProgress?.status === "completed"
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
                {selectedProgress?.status === "completed"
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

            <div className="book-progress-actions">
              <button
                className="secondary-button"
                disabled={working || selectedProgress?.status === "reading" || selectedProgress?.status === "completed"}
                onClick={() => void setBookStatus("reading")}
              >
                {selectedProgress?.status === "reading" || selectedProgress?.status === "completed"
                  ? "Reading started ✓"
                  : "Start reading"}
              </button>
              <button
                className="primary-button compact"
                disabled={working || selectedProgress?.status === "completed"}
                onClick={() => void setBookStatus("completed")}
              >
                {selectedProgress?.status === "completed"
                  ? "Book completed ✓"
                  : `I finished the book · +${selectedBook.completion_xp} XP`}
              </button>
            </div>

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
          </div>
        </section>
      )}
    </div>
  );
}
