import { useCallback, useEffect, useId, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { downloadDigitalPage, getDigitalBook, saveDigitalBookPosition, type DigitalBook, type ReadyDigitalBook } from "../lib/digitalBooks";
import { ModalDialog } from "./ModalDialog";
import { readerKeyPage, readerSwipePage } from "../lib/readerNavigation";

export function DigitalBookEntry({ childId, bookId, title }: { childId: string; bookId: string; title: string }) {
  const [book, setBook] = useState<DigitalBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const version = useRef(0);
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setError(false); setBook(null);
    try {
      const next = await getDigitalBook(supabase, childId, bookId);
      if (request === version.current) setBook(next);
    } catch { if (request === version.current) setError(true); }
    finally { if (request === version.current) setLoading(false); }
  }, [childId, bookId]);
  useEffect(() => { void load(); return () => { version.current++; }; }, [load]);
  return <div className="digital-book-entry">
    {loading ? <p role="status">Checking digital book availability...</p>
      : error ? <p role="alert">Digital book availability could not be checked. <button className="text-button" onClick={() => void load()}>Try again</button></p>
      : book?.availability === "ready" ? <button className="primary-button compact" onClick={() => setOpen(true)}>{book.page_number > 1 ? "Continue digital book" : "Open digital book"}</button>
      : <p className="muted">{book?.availability === "locked" ? "A guardian can check this family's digital book access in Family Hub." : "The digital edition is not available yet. You can still enjoy the Book Companion below."}</p>}
    {open && book?.availability === "ready" && <DigitalBookReader childId={childId} bookId={bookId} title={title} book={book}
      onClose={() => { setOpen(false); void load(); }} />}
  </div>;
}

function DigitalBookReader({ childId, bookId, title, book, onClose }: {
  childId: string; bookId: string; title: string; book: ReadyDigitalBook; onClose: () => void;
}) {
  const headingId = useId();
  const pageTextId = useId();
  const helpId = useId();
  const [page, setPage] = useState(book.page_number);
  const [retry, setRetry] = useState(0);
  const [image, setImage] = useState<{ url: string; page: number; request: number } | null>(null);
  const [phase, setPhase] = useState<"loading" | "decoding" | "saving" | "ready" | "failed">("loading");
  const [saveError, setSaveError] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [showText, setShowText] = useState(false);
  const navigationPending = useRef(false);
  const swipe = useRef<{ id: number; x: number; y: number; time: number } | null>(null);
  const version = useRef(0);
  const saveBusy = useRef(false);
  const savedRequest = useRef(0);

  useEffect(() => {
    const request = ++version.current;
    let url: string | undefined;
    setImage(null); setPhase("loading"); setSaveError(false); setZoom(false);
    void (async () => {
      try {
        const blob = await downloadDigitalPage(supabase, childId, bookId, book, page);
        if (request !== version.current) return;
        url = URL.createObjectURL(blob);
        setImage({ url, page, request }); setPhase("decoding");
      } catch { if (request === version.current) setPhase("failed"); }
    })();
    return () => { version.current++; if (url) URL.revokeObjectURL(url); };
  }, [childId, bookId, book, page, retry]);

  async function savePlace(request: number) {
    if (request !== version.current || saveBusy.current || savedRequest.current === request) return;
    saveBusy.current = true; setPhase("saving"); setSaveError(false);
    try {
      await saveDigitalBookPosition(supabase, childId, bookId, book.revision, page);
      window.dispatchEvent(new Event("dc-reading-updated"));
      if (request === version.current) savedRequest.current = request;
    } catch { if (request === version.current) setSaveError(true); }
    finally { saveBusy.current = false; if (request === version.current) setPhase("ready"); }
  }
  const busy = phase === "loading" || phase === "decoding" || phase === "saving";
  useEffect(() => {
    if (phase === "ready" || phase === "failed") navigationPending.current = false;
  }, [phase]);
  function goToPage(target: number) {
    if (busy || saveBusy.current || navigationPending.current || !Number.isInteger(target) || target < 1 || target > book.pages.length || target === page) return;
    navigationPending.current = true; swipe.current = null;
    setPhase("loading"); setPage(target);
  }
  return <ModalDialog className="digital-book-reader" labelledBy={headingId} busy={phase === "saving"} onClose={onClose}>
    <header className="digital-reader-header"><div><p className="eyebrow red">Read together</p><h2 id={headingId}>{title}</h2></div>
      <button className="secondary-button" disabled={phase === "saving"} onClick={onClose}>Close book</button></header>
    <nav className="digital-reader-controls" aria-label="Book pages">
      <button className="secondary-button" disabled={busy || page === 1} onClick={() => goToPage(page - 1)}>Previous page</button>
      <label>Page <select aria-label="Go to page" value={page} disabled={busy} onChange={event => goToPage(Number(event.target.value))}>
        {book.pages.map((_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
      </select> of {book.pages.length}</label>
      <button className="secondary-button" disabled={busy || page === book.pages.length} onClick={() => goToPage(page + 1)}>Next page</button>
      <button className="text-button" aria-pressed={zoom} disabled={!image || phase === "failed"} onClick={() => setZoom(value => !value)}>{zoom ? "Fit page" : "Enlarge page"}</button>
      <button className="text-button" aria-expanded={showText} aria-controls={pageTextId} onClick={() => setShowText(value => !value)}>{showText ? "Hide page text" : "Read page text"}</button>
    </nav>
    <p className="digital-reader-status" role="status">{phase === "loading" || phase === "decoding" ? "Opening page..." : phase === "saving" ? "Saving your place..." : phase === "ready" && !saveError ? `Your place is saved on page ${page}.` : ""}</p>
    {saveError && <p role="alert">Your place could not be saved. <button className="text-button" onClick={() => image && void savePlace(image.request)}>Save my place</button></p>}
    {phase === "failed" && <p role="alert">This page could not be opened. Check your connection and try again. If access has changed, close and reopen the book. <button className="secondary-button" onClick={() => setRetry(value => value + 1)}>Try page again</button></p>}
    <p id={helpId} className="muted digital-reader-help">{zoom ? "Scroll to explore the enlarged page. Choose Fit page to swipe between pages." : "Swipe left or right on the page. With the page focused, use arrow keys to turn pages, Home for the first page, or End for the last."}</p>
    <div className={`digital-reader-page${zoom ? " enlarged" : ""}`} tabIndex={0} role="region" aria-label={`Book page ${page}`} aria-describedby={helpId}
      onKeyDown={event => {
        const target = readerKeyPage(event.key, page, book.pages.length, busy || zoom || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);
        if (target !== null) { event.preventDefault(); goToPage(target); }
      }}
      onPointerDown={event => {
        if (!event.isPrimary) { swipe.current = null; return; }
        if (event.pointerType !== "touch" || busy || zoom) return;
        swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { swipe.current = null; }}
      onLostPointerCapture={() => { swipe.current = null; }}
      onPointerUp={event => {
        const start = swipe.current; swipe.current = null;
        if (!start || start.id !== event.pointerId) return;
        const target = readerSwipePage(event.clientX - start.x, event.clientY - start.y, event.timeStamp - start.time, page, book.pages.length, busy || zoom);
        if (target !== null) goToPage(target);
      }}>
      {image && image.page === page && phase !== "failed" && <img src={image.url} alt={book.pages[page - 1].alt}
        onLoad={() => void savePlace(image.request)} onError={() => { if (image.request === version.current) setPhase("failed"); }} />}
    </div>
    <section id={pageTextId} className="digital-reader-text" hidden={!showText} aria-label={`Text and description for page ${page}`}>
      <h3>Page {page}: text and description</h3>
      <p>{book.pages[page - 1].alt}</p>
    </section>
    {page === book.pages.length && phase === "ready" && <p>You reached the last page. Close the book when you are ready to continue your Book Adventure.</p>}
  </ModalDialog>;
}
