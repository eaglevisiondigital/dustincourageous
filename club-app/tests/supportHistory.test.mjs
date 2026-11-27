import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { readSupportTicket } from "../src/lib/supportHistory.ts";

const household = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const row = { id, household_id: household, ticket_number: 12, category: "technical", subject: "Book access",
  message: "First line\nSecond line", status: "open", created_at: "2026-09-25T01:00:00Z", updated_at: "2026-09-25T02:00:00Z", resolved_at: null };
function fixture(data, status = 200) {
  const urls = [];
  const client = createClient("https://support.example.test", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async url => { urls.push(new URL(url)); return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }); } }
  });
  return { client, urls };
}

test("support details request the selected household and ticket without internal fields", async () => {
  const f = fixture([row]);
  assert.deepEqual(await readSupportTicket(f.client, household, id), row);
  assert.equal(f.urls[0].searchParams.get("household_id"), `eq.${household}`);
  assert.equal(f.urls[0].searchParams.get("id"), `eq.${id}`);
  assert.ok(!/metadata|assigned_admin|priority|user_id/.test(f.urls[0].searchParams.get("select")));
});

test("support details distinguish inaccessible requests from failed retrieval", async () => {
  assert.equal(await readSupportTicket(fixture([]).client, household, id), null);
  await assert.rejects(readSupportTicket(fixture({ code: "42501", message: "Denied" }, 403).client, household, id));
});

test("support details reject another household, another ticket, and malformed dates", async () => {
  for (const change of [{ household_id: "another-family" }, { id: "another-ticket" }, { updated_at: "bad" }, { resolved_at: "bad" }]) {
    await assert.rejects(readSupportTicket(fixture([{ ...row, ...change }]).client, household, id));
  }
});

test("support details require both household and ticket before making a request", async () => {
  const f = fixture([row]);
  await assert.rejects(readSupportTicket(f.client, "", id));
  await assert.rejects(readSupportTicket(f.client, household, ""));
  assert.equal(f.urls.length, 0);
});
