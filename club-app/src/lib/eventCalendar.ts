import type { Database } from "../types/database";

export type CalendarEvent = Pick<Database["public"]["Tables"]["events"]["Row"],
  "id" | "title" | "description" | "starts_at" | "ends_at" | "timezone" | "location_name" | "location_address" | "virtual_url">;

export function safeEventLink(value: string | null) {
  if (!value || /[\r\n\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function validDate(value: string) {
  // Require an explicit offset so an event never silently becomes device-local.
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new Error("The event time is unavailable.");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("The event time is unavailable.");
  return date;
}

export function eventTimeDetails(event: CalendarEvent, localZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const start = validDate(event.starts_at);
  let zone = event.timezone;
  let zoneFallback = false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(start); }
  catch { zone = "UTC"; zoneFallback = true; }
  const format = (date: Date, timeZone: string) => new Intl.DateTimeFormat(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone
  }).format(date);
  const end = event.ends_at ? validDate(event.ends_at) : null;
  if (end && end <= start) throw new Error("The event end time needs correction.");
  return {
    month: new Intl.DateTimeFormat(undefined, { month: "short", timeZone: zone }).format(start),
    day: new Intl.DateTimeFormat(undefined, { day: "numeric", timeZone: zone }).format(start),
    start: format(start, zone), end: end ? format(end, zone) : null,
    localStart: zone !== localZone ? format(start, localZone) : null,
    zone, zoneFallback
  };
}

function textValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

function foldLine(line: string) {
  const encoder = new TextEncoder();
  let current = "", length = 0;
  const parts: string[] = [];
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (length + size > 75) { parts.push(current); current = " "; length = 1; }
    current += character; length += size;
  }
  parts.push(current);
  return parts.join("\r\n");
}

export function buildEventCalendar(event: CalendarEvent, now = new Date()) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.id) || !event.title.trim()) {
    throw new Error("The event details are unavailable.");
  }
  const start = validDate(event.starts_at);
  const end = event.ends_at ? validDate(event.ends_at) : null;
  if (end && end <= start) throw new Error("The event end time needs correction.");
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const link = safeEventLink(event.virtual_url);
  const description = [event.description,
    "Calendar reminder only. Check Adventure Club for your registration status and event updates. This calendar file does not update automatically.",
    link ? `Online event: ${link}` : null].filter(Boolean).join("\n\n");
  const location = [event.location_name, event.location_address].filter(Boolean).join(", ");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Dustin Courageous//Adventure Club//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${event.id}@dustincourageous.com`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`,
    ...(end ? [`DTEND:${stamp(end)}`] : []), `SUMMARY:${textValue(event.title)}`, `DESCRIPTION:${textValue(description)}`,
    ...(location ? [`LOCATION:${textValue(location)}`] : []), "END:VEVENT", "END:VCALENDAR"];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
