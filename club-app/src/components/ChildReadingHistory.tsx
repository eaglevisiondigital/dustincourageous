import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { readChildReadingHistory } from "../lib/childReadingHistory";

export function ChildReadingHistory({ childId }: { childId: string }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof readChildReadingHistory>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const version = useRef(0);
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setError(false);
    try {
      const history = await readChildReadingHistory(supabase, childId);
      if (request === version.current) setRows(history);
    } catch { if (request === version.current) setError(true); }
    finally { if (request === version.current) setLoading(false); }
  }, [childId]);
  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("dc-reading-updated", refresh);
    return () => { version.current++; window.removeEventListener("dc-reading-updated", refresh); };
  }, [load]);
  return <section className="child-reading-history" aria-label="Digital reading places" aria-busy={loading}>
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
      </li>)}</ul>}
  </section>;
}
