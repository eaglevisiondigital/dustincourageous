import test from "node:test";
import assert from "node:assert/strict";
import { parsePaymentEvent, isCommittedReplay } from "../../supabase/functions/commerce-payment-webhook-v2/validation.ts";

const body = {
  provider: "test-provider", event_id: "evt-1", payment_id: "pay-1",
  order_id: "00000000-0000-4000-8000-000000000001", status: "paid",
  provider_checkout_id: "checkout-1", amount_cents: 1500, currency: "usd"
};

test("paid events preserve identifiers and normalize currency", () => {
  const event = parsePaymentEvent(body);
  assert.equal(event.currency, "USD");
  assert.equal(event.amountCents, 1500);
  assert.equal(event.eventId, "evt-1");
});

for (const [name, change] of [
  ["object identifier", { provider: {} }], ["blank identifier", { event_id: " " }],
  ["invalid order", { order_id: "not-a-uuid" }], ["numeric string", { amount_cents: "1500" }],
  ["fractional amount", { amount_cents: 1.5 }], ["negative amount", { amount_cents: -1 }],
  ["unsafe integer", { amount_cents: Number.MAX_SAFE_INTEGER + 1 }],
  ["missing checkout", { provider_checkout_id: "" }], ["invalid currency", { currency: "USDD" }],
  ["address array", { shipping_address: [] }], ["object customer", { customer_id: {} }]
]) test(`rejects ${name}`, () => assert.throws(() => parsePaymentEvent({ ...body, ...change })));

test("non-object bodies cannot reach payment processing", () => {
  for (const value of [null, [], "paid", 12]) assert.throws(() => parsePaymentEvent(value));
});

test("non-paid events are ignored without allocating a payment receipt", () => {
  assert.equal(parsePaymentEvent({ ...body, status: "pending" }), null);
});

test("committed replay depends on the receipt, even after the order advances", () => {
  assert.equal(isCommittedReplay(parsePaymentEvent(body), { order_id: body.order_id, status: "processed", payload: body }), true);
});

test("changed payment identity or amount never qualifies as a replay", () => {
  const receipt = { order_id: body.order_id, status: "processed", payload: body };
  for (const change of [
    { provider: "other" }, { event_id: "evt-2" }, { payment_id: "pay-2" },
    { order_id: "00000000-0000-4000-8000-000000000002" },
    { provider_checkout_id: "checkout-2" }, { amount_cents: 1501 }, { currency: "CAD" }
  ]) assert.equal(isCommittedReplay(parsePaymentEvent({ ...body, ...change }), receipt), false);
});

test("unprocessed, ignored, malformed, or cross-order receipts require review", () => {
  const event = parsePaymentEvent(body);
  for (const change of [
    { status: "ignored" }, { status: "processing" }, { payload: null },
    { payload: { ...body, status: "pending" } }, { order_id: "other" }
  ]) assert.equal(isCommittedReplay(event, { order_id: body.order_id, status: "processed", payload: body, ...change }), false);
});
