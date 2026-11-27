import test from "node:test";
import assert from "node:assert/strict";
import { readChildDashboard } from "../src/lib/childDashboard.ts";
import { saveChallengeCompletion } from "../src/lib/challengeProgress.ts";

function clientWith(results) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, filters: [], update: null };
      calls.push(call);
      const query = {
        select() { return query; },
        eq(column, value) { call.filters.push([column, value]); return query; },
        order() { return query; },
        limit() { return query; },
        maybeSingle() { return query; },
        single() { return query; },
        update(value) { call.update = value; return query; },
        then(resolve, reject) { return Promise.resolve(results[table]).then(resolve, reject); }
      };
      return query;
    }
  };
}

const dashboard = {
  child_xp_totals: { data: { total_xp: "240" }, error: null },
  badge_awards: { count: 2, error: null },
  child_active_streak_badges: { count: 1, error: null },
  child_token_totals: { data: { total: "4" }, error: null },
  child_streaks: { data: { current_count: 3 }, error: null },
  child_challenge_progress: { count: 6, error: null },
  challenges: { data: [{ id: "challenge" }], error: null }
};

test("dashboard combines progress and scopes every child query", async () => {
  const client = clientWith(dashboard);
  const result = await readChildDashboard(client, "child-a");
  assert.deepEqual(result.snapshot, { xp: 240, badges: 3, weeklyStars: 4, streak: 3, completedChallenges: 6 });
  for (const call of client.calls.filter(call => call.table !== "challenges")) {
    assert.ok(call.filters.some(([column, value]) => column === "child_profile_id" && value === "child-a"));
  }
});

for (const table of Object.keys(dashboard)) {
  test(`a failed ${table} query cannot become a zero-progress dashboard`, async () => {
    const error = new Error("Unavailable");
    const client = clientWith({ ...dashboard, [table]: { data: null, error } });
    await assert.rejects(readChildDashboard(client, "child-a"), error);
  });
}

test("a successful empty dashboard represents a new child's zero progress", async () => {
  const client = clientWith(Object.fromEntries(Object.keys(dashboard).map(table => [table, { data: null, count: 0, error: null }])));
  const result = await readChildDashboard(client, "new-child");
  assert.deepEqual(result.snapshot, { xp: 0, badges: 0, weeklyStars: 0, streak: 0, completedChallenges: 0 });
  assert.deepEqual(result.challenges, []);
});

for (const status of ["completed", "pending_parent"]) {
  test(`completion confirms database status ${status} and guards child and previous status`, async () => {
    const client = clientWith({ child_challenge_progress: { data: { id: "progress", status }, error: null } });
    const saved = await saveChallengeCompletion(client, "progress", "child-a", "in_progress", status);
    assert.equal(saved.status, status);
    assert.deepEqual(client.calls[0].filters, [["id", "progress"], ["child_profile_id", "child-a"], ["status", "in_progress"]]);
    assert.equal(client.calls[0].update.status, status);
  });
}

for (const result of [
  { data: null, error: new Error("No row returned") },
  { data: null, error: null },
  { data: { id: "progress", status: "in_progress" }, error: null },
  { data: { id: "other-progress", status: "completed" }, error: null }
]) {
  test(`unconfirmed completion rejects: ${JSON.stringify(result.data)}`, async () => {
    const client = clientWith({ child_challenge_progress: result });
    await assert.rejects(saveChallengeCompletion(client, "progress", "child-a", "in_progress", "completed"));
  });
}
