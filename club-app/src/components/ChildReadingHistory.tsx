import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { readChildReadingHistory } from "../lib/childReadingHistory";
import { ReadingHistoryLaunch } from "./ReadingHistoryLaunch";

export function ChildReadingHistory({ childId }: { childId: string }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof readChildReadingHistory>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<{ bookId: string; title: string } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const launchButtons = useRef(new Map<string, HTMLButtonElement>());
  const version = useRef(0);
  const load = useCallback(async (background = false) => {
    const request = ++version.current;
    if (!background) setLoading(true);
    setError(false);
    try {
      const history = await readChildReadingHistory(supabase, childId);
      if (request === version.current) setRows(history);
    } catch { if (request === version.current) setError(true); }
    finally { if (request === version.current) setLoading(false); }
  }, [childId]);
  useEffect(() => {
    void load();
    const refresh = () => void load(true);
    window.addEventListener("dc-reading-updated", refresh);
    return () => { version.current++; window.removeEventListener("dc-reading-updated", refresh); };
  }, [load]);
  function closeReader() {
    const bookId = selected?.bookId;
    setSelected(null);
    requestAnimationFrame(() => {
      (bookId && launchButtons.current.get(bookId) || sectionRef.current)?.focus({ preventScroll: true });
    });
  }
  return <section ref={sectionRef} tabIndex={-1} className="child-reading-history" aria-label="Digital reading places" aria-busy={loading}>
    <h3>Digital Reading Places</h3>
    <p>The most recent saved place in up to 20 books. A saved page does not count as finishing a book. A new edition may restart at page 1.</p>
    {loading ? <p role="status">Loading reading places...</p> : error ? <>
      <p role="alert">Reading places could not be loaded.</p>
      <button className="secondary-button" onClick={() => void load()}>Try again</button>
    </> : rows.length === 0 ? <p>No saved reading places yet. Open a digital book from the Bookshelf to begin.</p> :
      <ul>{rows.map(row => <li key={row.bookId}>
        <strong>{row.title}</strong>
        <span>Saved at page {row.page}</span>
        <span>Last saved <time dateTime={row.updatedAt}>{new Date(row.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time></span>
        <button type="button" className="secondary-button reading-history-open"
          ref={element => { if (element) launchButtons.current.set(row.bookId, element); else launchButtons.current.delete(row.bookId); }}
          disabled={selected !== null} aria-label={`Read ${row.title} together`}
          onClick={() => setSelected({ bookId: row.bookId, title: row.title })}>Read together</button>
      </li>)}</ul>}
    {selected && <ReadingHistoryLaunch key={`${childId}:${selected.bookId}`} childId={childId}
      bookId={selected.bookId} title={selected.title} onClose={closeReader} />}
  </section>;
}
