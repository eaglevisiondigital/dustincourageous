import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { parseDigitalBook, type ReadyDigitalBook } from "../lib/digitalBooks";

export function DigitalBookReview({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<ReadyDigitalBook | null>(null);
  const [page, setPage] = useState(0);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [show, setShow] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setBook(null); setPage(0);
    void (async () => {
      try {
        const result = await supabase.rpc("admin_get_digital_book", { p_book_id: bookId });
        if (result.error) throw result.error;
        if (result.data === null) return;
        if (typeof result.data !== "object" || Array.isArray(result.data)) throw new Error("Invalid edition.");
        const parsed = parseDigitalBook({ ...result.data, availability: "ready", page_number: 1 }, bookId);
        if (active && parsed.availability === "ready") setBook(parsed);
      } catch { if (active) setError("The prepared edition could not be loaded."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [bookId, retry]);
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setUrl("");
    if (!book || !show) return;
    setError("");
    void (async () => {
      try {
        const result = await supabase.storage.from("dc-digital-books").download(book.pages[page].path);
        if (result.error || !result.data || !["image/png", "image/jpeg", "image/webp"].includes(result.data.type)) throw new Error("Page unavailable.");
        if (active) { objectUrl = URL.createObjectURL(result.data); setUrl(objectUrl); }
      } catch { if (active) setError("This prepared page could not be opened."); }
    })();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [book, page, show]);
  return <div className="digital-edition-review">
    <h3>Review the prepared edition</h3>
    {loading ? <p role="status">Checking prepared pages...</p> : !book && !error ? <p>No digital edition has been prepared for this book.</p> : null}
    {error && <p role="alert">{error} <button className="text-button" onClick={() => setRetry(value => value + 1)}>Try again</button></p>}
    {book && <>
      <p>{book.pages.length} pages. Revision: <code>{book.revision}</code>. This preview does not publish or approve the book.</p>
      <button className="secondary-button" aria-expanded={show} onClick={() => setShow(value => !value)}>{show ? "Hide prepared pages" : "Review prepared pages"}</button>
      {show && <><label>Prepared page <select value={page} onChange={event => setPage(Number(event.target.value))}>
        {book.pages.map((_, index) => <option key={index} value={index}>{index + 1}</option>)}
      </select></label>
        {!url && !error && <p role="status">Opening prepared page...</p>}
        {url && <img className="digital-upload-preview" src={url} alt={book.pages[page].alt} onError={() => setError("This page image could not be displayed.")} />}
        <p style={{ whiteSpace: "pre-wrap" }}>{book.pages[page].alt}</p>
      </>}
    </>}
  </div>;
}
