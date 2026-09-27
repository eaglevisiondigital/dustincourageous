import { useCallback, useEffect, useId, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { readSupportTicket, type SupportTicketDetail } from "../lib/supportHistory";
import { ModalDialog } from "./ModalDialog";

export function SupportTicketDetails({ householdId, ticketId, onClose }: {
  householdId: string; ticketId: string; onClose: () => void;
}) {
  const heading = useId();
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const version = useRef(0);
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setError(false); setTicket(null);
    try {
      const result = await readSupportTicket(supabase, householdId, ticketId);
      if (request === version.current) setTicket(result);
    } catch { if (request === version.current) setError(true); }
    finally { if (request === version.current) setLoading(false); }
  }, [householdId, ticketId]);
  useEffect(() => { void load(); return () => { version.current++; }; }, [load]);
  const date = (value: string) => <time dateTime={value}>{new Date(value).toLocaleString()}</time>;

  return <ModalDialog className="support-ticket-dialog" labelledBy={heading} onClose={onClose}>
    <header className="support-ticket-heading"><h2 id={heading}>Support request{ticket ? ` #${ticket.ticket_number}` : ""}</h2>
      <button type="button" className="secondary-button" onClick={onClose}>Close Request</button></header>
    <button type="button" className="secondary-button" disabled={loading} onClick={() => void load()}>Refresh Request</button>
    {loading ? <p role="status">Loading your request...</p> : error ? <p role="alert">The request could not be loaded. Use Refresh request to try again.</p>
      : !ticket ? <p role="status">This request is no longer available to this family.</p> : <>
        <h3>{ticket.subject}</h3>
        <p className="support-ticket-status">{ticket.status.replaceAll("_", " ")} · {ticket.category.replaceAll("_", " ")}</p>
        <dl className="support-ticket-dates">
          <div><dt>Submitted</dt><dd>{date(ticket.created_at)}</dd></div>
          <div><dt>Last Updated</dt><dd>{date(ticket.updated_at)}</dd></div>
          {ticket.resolved_at && <div><dt>Resolved</dt><dd>{date(ticket.resolved_at)}</dd></div>}
        </dl>
        <h3>Submitted Message</h3>
        <div className="support-ticket-message">{ticket.message}</div>
      </>}
  </ModalDialog>;
}
