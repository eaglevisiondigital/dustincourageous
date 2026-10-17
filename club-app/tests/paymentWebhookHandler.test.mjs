import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
import { parsePaymentEvent, isCommittedReplay } from "../../supabase/functions/commerce-payment-webhook-v2/validation.ts";

const source = readFileSync(new URL("../../supabase/functions/commerce-payment-webhook-v2/index.ts", import.meta.url), "utf8");
const code = stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, ""));
const payload = {
  provider: "fixture", event_id: "evt-1", payment_id: "pay-1", status: "paid",
  order_id: "00000000-0000-4000-8000-000000000001",
  provider_checkout_id: "session-1", amount_cents: 1000, currency: "USD"
};
const receipt = { order_id: payload.order_id, status: "processed", payload };
const checkout = {
  checkout_status: "provider_pending", order_status: "pending_payment",
  payment_provider: "fixture", provider_checkout_id: "session-1", total_cents: 1000, currency: "USD"
};

function handlerFixture({ receipts = [null, receipt], session = checkout, lookupError = null, auditError = null } = {}) {
  const calls = [];
  let handler;
  const client = {
    from(table) {
      calls.push(table);
      const query = {
        select() { return query; }, eq() { return query; },
        async maybeSingle() {
          return { data: table === "payment_webhook_events" ? receipts.shift() : session, error: lookupError };
        }
      };
      return query;
    },
    async rpc(name, args) {
      calls.push({ name, args });
      return { error: name === "record_integration_event" ? auditError : null };
    }
  };
  vm.runInNewContext(code, {
    Response, parsePaymentEvent, isCommittedReplay, createClient: () => client,
    Deno: { env: { get: key => ({ DC_COMMERCE_WEBHOOK_SECRET: "fixture-secret", SUPABASE_URL: "https://fixture.invalid", SUPABASE_SECRET_KEYS: '{"default":"fixture-only"}' })[key] }, serve: fn => { handler = fn; } }
  });
  return {
    calls,
    async send(body = payload, secret = "fixture-secret") {
      const response = await handler(new Request("https://fixture.invalid/webhook", {
        method: "POST", headers: { "x-dc-commerce-secret": secret }, body: JSON.stringify(body)
      }));
      return { status: response.status, body: await response.json() };
    }
  };
}

test("unauthenticated callbacks never access payment data", async () => {
  const fixture = handlerFixture();
  assert.equal((await fixture.send(payload, "wrong")).status, 401);
  assert.deepEqual(fixture.calls, []);
});

test("pending callbacks cannot poison the paid receipt key", async () => {
  const fixture = handlerFixture();
  assert.equal((await fixture.send({ ...payload, status: "pending" })).body.ignored, true);
  assert.deepEqual(fixture.calls, []);
});

test("a confirmed paid event invokes payment mutation once and verifies its receipt", async () => {
  const fixture = handlerFixture();
  assert.equal((await fixture.send()).status, 200);
  assert.equal(fixture.calls.filter(call => call.name === "mark_order_paid_from_provider").length, 1);
  assert.equal(fixture.calls.filter(call => call === "payment_webhook_events").length, 2);
});

test("committed replay succeeds without rereading or mutating a fulfilled order", async () => {
  const fixture = handlerFixture({ receipts: [receipt], session: { ...checkout, order_status: "fulfilled" } });
  assert.equal((await fixture.send()).body.replay, true);
  assert.deepEqual(fixture.calls, ["payment_webhook_events"]);
});

test("a late paid callback is recorded without mutating the expired order", async () => {
  const fixture = handlerFixture({ session: { ...checkout, checkout_status: "expired", order_status: "canceled" } });
  assert.equal((await fixture.send()).status, 409);
  assert.equal(fixture.calls.some(call => call.name === "mark_order_paid_from_provider"), false);
  const log = fixture.calls.find(call => call.name === "record_integration_event");
  assert.equal(log.args.p_event_type, "payment_reconciliation_required");
  assert.equal("shipping_address" in log.args.p_request_payload, false);
});

test("a competing callback cannot make a conflicting receipt look successful", async () => {
  const fixture = handlerFixture({ receipts: [null, { ...receipt, payload: { ...payload, payment_id: "other-payment" } }] });
  assert.equal((await fixture.send()).status, 409);
  assert.equal(fixture.calls.some(call => call.name === "record_integration_event"), true);
});

test("database read failures ask for retry without mutation", async () => {
  const fixture = handlerFixture({ lookupError: { message: "Unavailable" } });
  assert.equal((await fixture.send()).status, 503);
  assert.deepEqual(fixture.calls, ["payment_webhook_events"]);
});

test("audit write failure returns retryable 503", async () => {
  const fixture = handlerFixture({ session: null, auditError: { message: "Unavailable" } });
  assert.equal((await fixture.send()).status, 503);
});
