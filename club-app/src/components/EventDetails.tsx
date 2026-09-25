import { useMemo, useState } from "react";
import { buildEventCalendar, eventTimeDetails, safeEventLink, type CalendarEvent } from "../lib/eventCalendar";

export function EventDetails({ event }: { event: CalendarEvent }) {
  const [error, setError] = useState("");
  const time = useMemo(() => { try { return eventTimeDetails(event); } catch { return null; } }, [event]);
  const link = safeEventLink(event.virtual_url);
  function saveCalendar() {
    setError("");
    try {
      const blob = new Blob([buildEventCalendar(event)], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `adventure-club-event-${event.id}.ics`;
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch { setError("The calendar reminder could not be prepared. Refresh the events and try again."); }
  }
  return <div className="event-details">
    {time ? <>
      <p><time dateTime={event.starts_at}>{time.start}</time>{time.end && <> to <time dateTime={event.ends_at!}>{time.end}</time></>}</p>
      <p className="event-timezone">Event timezone: {time.zone}{time.zoneFallback ? " (event timezone unavailable)" : ""}</p>
      {time.localStart && <p>Your time: {time.localStart}</p>}
    </> : <p role="alert">The event time needs to be checked. Refresh events or contact support before making plans.</p>}
    {event.location_name && <p>{event.location_name}</p>}
    {event.location_address && <p className="event-address">{event.location_address}</p>}
    <div className="event-detail-actions">
      {link && <a className="secondary-button" href={link} target="_blank" rel="noopener noreferrer">Open online event</a>}
      {time && <button type="button" className="secondary-button" onClick={saveCalendar}>Add calendar reminder</button>}
    </div>
    {time && <p className="event-calendar-note">A reminder does not register your family. Check here for event changes.</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
