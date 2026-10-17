import test from "node:test";
import assert from "node:assert/strict";
import { hasCurrentMemberPricing, prepareHostedCheckout, secureExternalUrl } from "../src/lib/storeCheckout.ts";

test("member estimates require a current eligible paid subscription", () => {
  const now = Date.parse("2026-09-24T12:00:00Z");
  const member = { plan_key: "premium", subscription_status: "active", current_period_end: null };
  assert.equal(hasCurrentMemberPricing(member, now), true);
  for (const status of ["trialing", "comped"]) {
    assert.equal(hasCurrentMemberPricing({ ...member, subscription_status: status }, now), true);
  }
  for (const change of [
    { plan_key: "free" }, { plan_key: null }, { subscription_status: "past_due" },
    { subscription_status: "canceled" }, { current_period_end: "2026-09-24T12:00:00Z" },
    { current_period_end: "invalid" }, { current_period_end: "2026-09-23T00:00:00Z" }
  ]) assert.equal(hasCurrentMemberPricing({ ...member, ...change }, now), false);
  assert.equal(hasCurrentMemberPricing(null, now), false);
});

test("external links require HTTPS without embedded credentials", () => {
  assert.equal(secureExternalUrl("https://payments.example/checkout?id=1"), "https://payments.example/checkout?id=1");
  for (const value of [null, {}, "", "/checkout", "//payments.example", "http://payments.example", "javascript:alert(1)", "data:text/html,test", "https://user:password@payments.example"]) {
    assert.equal(secureExternalUrl(value), null);
  }
});

test("checkout saves recovery information before invoking the payment adapter", async () => {
  const calls = [];
  const client = { functions: { async invoke(name, args) {
    calls.push([name, args.body.checkout_session_id]);
    return { data: { checkout_url: "https://payments.example/session" }, error: null };
  } } };
  assert.equal(await prepareHostedCheckout(client, "session-1", id => calls.push(["remember", id])), "https://payments.example/session");
  assert.deepEqual(calls, [["remember", "session-1"], ["commerce-checkout", "session-1"]]);
});

for (const [name, response] of [
  ["transport error", { data: null, error: { message: "Network unavailable" } }],
  ["provider disabled", { data: { error: "Unavailable", code: "provider_not_configured" }, error: null }],
  ["missing redirect", { data: {}, error: null }],
  ["unsafe redirect", { data: { checkout_url: "javascript:alert(1)" }, error: null }]
]) test(`checkout retains recovery information after ${name}`, async () => {
  let remembered;
  const client = { functions: { async invoke() { return response; } } };
  await assert.rejects(prepareHostedCheckout(client, "session-2", id => { remembered = id; }));
  assert.equal(remembered, "session-2");
});

test("thrown network failures retain the session for recovery", async () => {
  let remembered;
  const client = { functions: { async invoke() { throw new Error("Disconnected"); } } };
  await assert.rejects(prepareHostedCheckout(client, "session-3", id => { remembered = id; }), /Disconnected/);
  assert.equal(remembered, "session-3");
});
