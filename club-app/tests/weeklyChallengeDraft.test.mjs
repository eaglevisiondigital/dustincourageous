import test from "node:test";
import assert from "node:assert/strict";
import { nextMondayDate, weeklyDraftArgs } from "../src/lib/weeklyChallengeDraft.ts";

const input = {
  seriesId: "series", title: " Courage this week ", slug: "courage-this-week",
  periodStart: "2026-09-28", description: "Practice courage", challengeType: "weekly",
  accessLevel: "free", xpReward: "100", parentApprovalRequired: false,
  steps: " Read the verse \n\nPractice with your family "
};

for (const accessLevel of ["free", "premium"]) {
  for (const parentApprovalRequired of [false, true]) {
    test(`${accessLevel} draft preserves guardian review=${parentApprovalRequired}`, () => {
      const args = weeklyDraftArgs({ ...input, accessLevel, parentApprovalRequired });
      assert.equal(args.p_access_level, accessLevel);
      assert.equal(args.p_parent_approval_required, parentApprovalRequired);
      assert.equal(args.p_status, "draft");
      assert.equal(args.p_title, "Courage this week");
      assert.equal(args.p_steps.length, 2);
      assert.ok(args.p_steps.every(step => step.is_required));
    });
  }
}

for (const xpReward of ["", "-1", "1.5", "Infinity", "2147483648"]) {
  test(`rejects unsupported XP value ${JSON.stringify(xpReward)}`, () => {
    assert.throws(() => weeklyDraftArgs({ ...input, xpReward }), /XP/);
  });
}

test("zero XP is allowed", () => assert.equal(weeklyDraftArgs({ ...input, xpReward: "0" }).p_xp_reward, 0));
test("invalid calendar dates cannot roll into the following month", () => {
  assert.throws(() => weeklyDraftArgs({ ...input, periodStart: "2026-02-30" }), /date/);
});
test("unknown access level is rejected", () => {
  assert.throws(() => weeklyDraftArgs({ ...input, accessLevel: "unexpected" }), /membership/);
});
test("next Monday follows local calendar dates in eastern and western timezones", () => {
  const original = process.env.TZ;
  try {
    for (const timezone of ["Pacific/Kiritimati", "America/Chicago"]) {
      process.env.TZ = timezone;
      assert.equal(nextMondayDate(new Date(2026, 8, 27, 20)), "2026-09-28");
      assert.equal(nextMondayDate(new Date(2026, 8, 28, 9)), "2026-10-05");
      assert.equal(nextMondayDate(new Date(2026, 11, 31, 23)), "2027-01-04");
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
