import test from "node:test";
import assert from "node:assert/strict";
import { readChildReadingHistory } from "../src/lib/childReadingHistory.ts";

const row = { child_profile_id: "child", book_id: "book", revision: "v1", page_number: 4, updated_at: "2026-09-25T01:00:00Z", books: { title: "Courage" } };
function fixture(data = [row], error = null) {
  const calls = [];
  const query = { select(value) { calls.push(["select", value]); return query; },
    eq(...args) { calls.push(["eq", ...args]); return query; },
    order(...args) { calls.push(["order", ...args]); return query; },
    limit(value) { calls.push(["limit", value]); return Promise.resolve({ data, error }); } };
  return { calls, from(table) { calls.push(["from", table]); return query; } };
}
test("reading history scopes the selected child and limits recent places", async () => {
  const client = fixture();
  assert.deepEqual(await readChildReadingHistory(client, "child"), [{ bookId: "book", title: "Courage", page: 4, updatedAt: row.updated_at }]);
  assert.ok(client.calls.some(call => JSON.stringify(call) === JSON.stringify(["eq", "child_profile_id", "child"])));
  assert.ok(client.calls.some(call => JSON.stringify(call) === JSON.stringify(["order", "updated_at", { ascending: false }])));
  assert.ok(client.calls.some(call => call[0] === "limit" && call[1] === 20));
});
test("hidden book metadata preserves the family's saved place", async () => {
  const result = await readChildReadingHistory(fixture([{ ...row, books: null }]), "child");
  assert.equal(result[0].title, "Book currently unavailable");
  assert.equal(result[0].page, 4);
});
test("failed reads are distinct from an empty history", async () => {
  assert.deepEqual(await readChildReadingHistory(fixture([]), "child"), []);
  await assert.rejects(readChildReadingHistory(fixture(null), "child"));
  await assert.rejects(readChildReadingHistory(fixture([], new Error("offline")), "child"));
});
test("missing child, mismatched child, and corrupt reading positions fail closed", async () => {
  const client = fixture();
  await assert.rejects(readChildReadingHistory(client, ""));
  assert.deepEqual(client.calls, []);
  for (const change of [{ child_profile_id: "other" }, { page_number: 0 }, { page_number: 301 }, { page_number: 1.5 }, { updated_at: "invalid" }]) {
    await assert.rejects(readChildReadingHistory(fixture([{ ...row, ...change }]), "child"));
  }
});
