import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { buildDigitalBookManifest, prepareDigitalBook, type BookPageUpload } from "../lib/digitalBookPreparation";
import { DigitalBookReview } from "./DigitalBookReview";

export function DigitalBookPreparation({ bookId, title, onPrepared, onBusyChange }: {
  bookId: string; title: string; onPrepared: () => Promise<void>; onBusyChange: (value: boolean) => void;
}) {
  const [entries, setEntries] = useState<BookPageUpload[]>([]);
  const [selected, setSelected] = useState(0);
  const [preview, setPreview] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [started, setStarted] = useState(false);
  const [working, setWorking] = useState(false);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(0);
  const [reviewVersion, setReviewVersion] = useState(0);
  const revision = useRef(crypto.randomUUID());
  const uploaded = useRef(new Set<string>());
  const busy = useRef(false);
  const mounted = useRef(true);
  const page = entries[selected];
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!page) { setPreview(""); return; }
    const url = URL.createObjectURL(page.file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [page?.file]);

  function move(direction: number) {
    const target = selected + direction;
    if (started || target < 0 || target >= entries.length) return;
    const next = [...entries]; [next[selected], next[target]] = [next[target], next[selected]];
    setEntries(next); setSelected(target); setConfirmed(false);
  }
  async function prepare() {
    if (busy.current || !confirmed || finished) return;
    try { buildDigitalBookManifest(bookId, revision.current, entries); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Check the page files and descriptions."); return; }
    busy.current = true; setWorking(true); onBusyChange(true); setStarted(true); setMessage("");
    let saved = false;
    try {
      await prepareDigitalBook(supabase, bookId, revision.current, entries, uploaded.current,
        count => { if (mounted.current) setCount(count); }, () => mounted.current);
      saved = true;
      if (!mounted.current) return;
      setFinished(true); setReviewVersion(value => value + 1); setMessage("Digital edition prepared. The book is now a draft and requires human review and publication through DC Governance.");
      await onPrepared();
    } catch {
      if (mounted.current) setMessage(saved ? "Digital edition prepared. Refresh Books Admin to see its latest status." : "Preparation could not be confirmed. Retry this preparation to reuse pages already uploaded.");
    } finally {
      busy.current = false;
      if (mounted.current) { setWorking(false); onBusyChange(false); }
    }
  }
  return <section className="admin-card digital-book-preparation">
    <p className="eyebrow red">Digital edition</p><h2>Prepare {title}</h2>
    <DigitalBookReview key={reviewVersion} bookId={bookId} />
    <p>Use the exact supplied page images or spreads. Check their order and include page text and a useful visual description for screen readers. Files remain private. Preparing an edition returns this book to draft for DC Governance review.</p>
    <label>Page images (PNG, JPG or WebP, up to 20 MB each)<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={started}
      onChange={event => {
        const files = Array.from(event.target.files ?? []).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        setEntries(files.map(file => ({ file, alt: "" }))); setSelected(0); setConfirmed(false); setMessage("");
      }} /></label>
    {!!entries.length && <>
      <label>Review page<select value={selected} onChange={event => setSelected(Number(event.target.value))}>
        {entries.map((entry, index) => <option key={index} value={index}>{index + 1}. {entry.file.name}</option>)}
      </select></label>
      <div className="digital-reader-controls"><button className="secondary-button" disabled={started || selected === 0} onClick={() => move(-1)}>Move earlier</button>
        <button className="secondary-button" disabled={started || selected === entries.length - 1} onClick={() => move(1)}>Move later</button></div>
      {preview && <img className="digital-upload-preview" src={preview} alt={`Source preview for page ${selected + 1}`} />}
      <label>Page {selected + 1}: description and text<textarea rows={5} maxLength={10000} disabled={started} value={page?.alt ?? ""}
        onChange={event => { setEntries(current => current.map((item, index) => index === selected ? { ...item, alt: event.target.value } : item)); setConfirmed(false); }} /></label>
      <label><input type="checkbox" checked={confirmed} disabled={started} onChange={event => setConfirmed(event.target.checked)} /> I checked the source pages, page order, and descriptions for this book.</label>
      <button className="primary-button" disabled={working || finished || !confirmed} onClick={() => void prepare()}>{working ? `Uploading ${count}/${entries.length} pages...` : started && !finished ? "Retry preparation" : "Prepare draft digital edition"}</button>
    </>}
    {message && <p className="form-message" role="status">{message}</p>}
    {started && !working && <button className="text-button" onClick={() => {
      revision.current = crypto.randomUUID(); uploaded.current = new Set(); setStarted(false); setFinished(false); setConfirmed(false); setCount(0); setMessage("");
    }}>Start a new edition preparation</button>}
  </section>;
}
