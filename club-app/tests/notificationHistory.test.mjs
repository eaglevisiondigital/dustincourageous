import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { readNotificationPage } from "../src/lib/notificationHistory.ts";

const user = "11111111-1111-4111-8111-111111111111";
const stamp = "2026-09-25T03:40:00.123456+00:00";
const row = n => ({ id: `22222222-2222-4222-8222-${String(n).padStart(12, "0")}`,
  user_id: user, title: `Alert ${n}`, body: "Family activity", status: "unread", created_at: stamp });
function fixture(respond) {
  const urls = [];
  const client = createClient("https://notifications.example.test", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async url => {
      const parsed = new URL(url); urls.push(parsed);
      const result = respond(parsed);
      return new Response(JSON.stringify(result.data), { status: result.status ?? 200, headers: { "Content-Type": "application/json" } });
    } }
  });
  return { client, urls };
}

test("notification first page scopes the guardian and requests a bounded lookahead", async () => {
  const f = fixture(() => ({ data: Array.from({ length: 13 }, (_, i) => row(30 - i)) }));
  const page = await readNotificationPage(f.client, user);
  assert.equal(page.items.length, 12);
  assert.deepEqual(page.next, { id: row(19).id, created_at: stamp });
  const params = f.urls[0].searchParams;
  assert.equal(params.get("user_id"), `eq.${user}`);
  assert.equal(params.get("order"), "created_at.desc,id.desc");
  assert.equal(params.get("limit"), "13");
  assert.equal(params.has("or"), false);
});

test("tied timestamps page without gaps or repeats after a new alert arrives", async () => {
  let rows = Array.from({ length: 25 }, (_, i) => row(30 - i));
  const f = fixture(url => {
    const before = url.searchParams.get("or")?.match(/id\.lt\.([a-f0-9-]+)/)?.[1];
    return { data: rows.filter(item => !before || item.id < before).slice(0, Number(url.searchParams.get("limit"))) };
  });
  const first = await readNotificationPage(f.client, user);
  rows.unshift(row(31));
  const second = await readNotificationPage(f.client, user, first.next);
  const third = await readNotificationPage(f.client, user, second.next);
  assert.deepEqual([...first.items, ...second.items, ...third.items].map(item => item.id), rows.slice(1).map(item => item.id));
  assert.equal(third.next, null);
  assert.equal(f.urls[1].searchParams.get("or"), `(created_at.lt.${stamp},and(created_at.eq.${stamp},id.lt.${first.next.id}))`);
});

test("exact final page and empty history do not offer another page", async () => {
  for (const size of [0, 12]) {
    const f = fixture(() => ({ data: Array.from({ length: size }, (_, i) => row(30 - i)) }));
    const page = await readNotificationPage(f.client, user);
    assert.equal(page.items.length, size);
    assert.equal(page.next, null);
  }
});

test("invalid cursor syntax and missing guardian fail before any request", async () => {
  const f = fixture(() => ({ data: [] }));
  await assert.rejects(readNotificationPage(f.client, ""));
  for (const cursor of [{ id: "bad", created_at: stamp }, { id: row(1).id, created_at: `${stamp},id.gt.0` }, { id: row(1).id, created_at: "2026-99-99T00:00:00Z" }]) {
    await assert.rejects(readNotificationPage(f.client, user, cursor));
  }
  assert.equal(f.urls.length, 0);
});

test("failed, malformed, and cross-guardian responses are never treated as empty history", async () => {
  for (const response of [
    { status: 403, data: { message: "Denied", code: "42501" } },
    { data: null }, { data: [{ ...row(1), user_id: "another-guardian" }] },
    { data: [{ ...row(1), created_at: "not-a-date" }] }
  ]) {
    const f = fixture(() => response);
    await assert.rejects(readNotificationPage(f.client, user));
  }
});
