import test from "node:test";
import assert from "node:assert/strict";
import { buildEventCalendar, eventTimeDetails, safeEventLink } from "../src/lib/eventCalendar.ts";

const event = {
  id: "11111111-1111-4111-8111-111111111111", title: "Family Adventure", description: "Read and learn together.",
  starts_at: "2026-09-25T00:30:00Z", ends_at: "2026-09-25T01:30:00Z", timezone: "America/Chicago",
  location_name: "Family Center", location_address: "100 Example Lane", virtual_url: "https://meet.example.test/family"
};
const now = new Date("2026-09-24T12:00:00Z");
const unfold = value => value.replace(/\r\n /g, "");

test("calendar uses exact UTC instants and stable event identity without attendee data", () => {
  const result = unfold(buildEventCalendar(event, now));
  for (const line of ["BEGIN:VCALENDAR", "VERSION:2.0", `UID:${event.id}@dustincourageous.com`, "DTSTAMP:20260924T120000Z",
    "DTSTART:20260925T003000Z", "DTEND:20260925T013000Z", "SUMMARY:Family Adventure", "END:VCALENDAR"]) {
    assert.ok(result.split("\r\n").includes(line), line);
  }
  assert.ok(result.includes("Calendar reminder only"));
  assert.ok(result.includes("does not update automatically"));
  assert.ok(!/ATTENDEE|ORGANIZER|METHOD:REQUEST|STATUS:CONFIRMED/.test(result));
});

test("calendar text cannot inject new event properties or extra events", () => {
  const result = unfold(buildEventCalendar({ ...event,
    title: "Adventure, friends; together\\today\r\nBEGIN:VEVENT",
    description: "Hello\nATTENDEE:mailto:someone@example.test"
  }, now));
  assert.equal(result.split("\r\n").filter(line => line === "BEGIN:VEVENT").length, 1);
  assert.ok(result.includes("SUMMARY:Adventure\\, friends\\; together\\\\today\\nBEGIN:VEVENT"));
  assert.ok(!result.split("\r\n").some(line => line.startsWith("ATTENDEE:")));
});

test("long multibyte content folds at 75 bytes without breaking Unicode", () => {
  const title = "勇気 💛 é".repeat(40);
  const result = buildEventCalendar({ ...event, title }, now);
  for (const line of result.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75);
  assert.ok(unfold(result).includes(`SUMMARY:${title}`));
  assert.ok(!result.includes("�"));
});

test("calendar does not invent an end time and rejects invalid event instants", () => {
  assert.ok(!buildEventCalendar({ ...event, ends_at: null }, now).includes("DTEND:"));
  for (const change of [{ starts_at: "bad" }, { starts_at: "2026-09-25T00:30:00" },
    { ends_at: "2026-09-25T00:29:00Z" }, { ends_at: event.starts_at }, { id: "bad\r\nBEGIN:VEVENT" }, { title: " " }]) {
    assert.throws(() => buildEventCalendar({ ...event, ...change }, now));
  }
});

test("event date badges use the event timezone instead of the device date", () => {
  const details = eventTimeDetails(event, "UTC");
  assert.equal(details.day, "24");
  assert.equal(details.zone, "America/Chicago");
  assert.ok(details.localStart);
  assert.equal(eventTimeDetails(event, "America/Chicago").localStart, null);
  const fallback = eventTimeDetails({ ...event, timezone: "bad-zone" }, "UTC");
  assert.equal(fallback.zone, "UTC");
  assert.equal(fallback.zoneFallback, true);
});

test("explicit daylight-saving offsets become distinct correct UTC calendar times", () => {
  for (const [start, expected] of [["2026-11-01T01:30:00-05:00", "20261101T063000Z"], ["2026-11-01T01:30:00-06:00", "20261101T073000Z"]]) {
    assert.ok(buildEventCalendar({ ...event, starts_at: start, ends_at: null }, now).includes(`DTSTART:${expected}`));
  }
});

test("online event links reject scripts, credentials, relative URLs, and control characters", () => {
  for (const value of [null, "javascript:alert(1)", "data:text/html,test", "http://example.test", "/meeting", "https://user:pass@example.test", "https://example.test\nATTENDEE:test"]) {
    assert.equal(safeEventLink(value), null);
    assert.ok(!unfold(buildEventCalendar({ ...event, virtual_url: value }, now)).includes("Online event:"));
  }
  assert.equal(safeEventLink("https://meet.example.test/family?q=a%20b"), "https://meet.example.test/family?q=a%20b");
});
