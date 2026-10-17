import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { getDigitalBook, type DigitalBook } from "../lib/digitalBooks";
import { DigitalBookReader } from "./DigitalBookReader";

// Mount a new session for each selected child/book. History is never proof of access.
export function ReadingHistoryLaunch({ childId, bookId, title, onClose }: {
  childId: string; bookId: string; title: string; onClose: () => void;
}) {
  const [book, setBook] = useState<DigitalBook | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setBook(null); setFailed(false);
    statusRef.current?.focus();
    void getDigitalBook(supabase, childId, bookId).then(
      result => { if (active) setBook(result); },
      () => { if (active) setFailed(true); }
    );
    return () => { active = false; };
  }, [childId, bookId, attempt]);

  if (book?.availability === "ready") {
    return <DigitalBookReader childId={childId} bookId={bookId} title={title} book={book} onClose={onClose} />;
  }

  return <div ref={statusRef} tabIndex={-1} className="reading-launch-status">
    <p role={failed ? "alert" : "status"}>
      {failed ? `We could not check access to ${title}. Please try again.`
        : book?.availability === "locked" ? `Your family's current access does not include ${title}. You can review membership access in Family Hub. Your saved place is kept.`
        : book?.availability === "unavailable" ? `${title} is not available to read right now. Your saved place is kept.`
        : `Checking access and the latest reading place for ${title}...`}
    </p>
    {failed && <button type="button" className="secondary-button" onClick={() => setAttempt(value => value + 1)}>Try opening again</button>}
    <button type="button" className="secondary-button" onClick={onClose}>{!failed && !book ? "Cancel opening" : "Dismiss"}</button>
  </div>;
}
