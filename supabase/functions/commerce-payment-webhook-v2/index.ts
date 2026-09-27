import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import { isCommittedReplay, parsePaymentEvent } from "./validation.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const expectedSecret = Deno.env.get("DC_COMMERCE_WEBHOOK_SECRET");
  const providedSecret = req.headers.get("x-dc-commerce-secret");

  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const secretKey = secretKeys.default as string | undefined;

  if (!supabaseUrl || !secretKey) {
    return json({ error: "Service configuration unavailable" }, 503);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const body = await req.json().catch(() => null);
  let event;
  try {
    event = parsePaymentEvent(body);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid payment event" }, 400);
  }
  // Unsupported events must not consume the successful-payment idempotency key.
  if (!event) return json({ ok: true, ignored: true });
  const { provider, eventId, eventType, orderId, paymentId, providerCheckoutId,
    amountCents, currency, customerId, shippingName, shippingAddress } = event;

  async function reconciliationRequired(reason: string) {
    const { error: logError } = await admin.rpc("record_integration_event", {
      p_provider_key: "commerce-primary",
      p_event_type: "payment_reconciliation_required",
      p_direction: "inbound",
      p_entity_type: "order",
      p_entity_id: orderId,
      p_status: "failed",
      p_idempotency_key: `payment-review:${provider}:${eventId}`,
      p_request_payload: { provider, event_id: eventId, order_id: orderId,
        payment_id: paymentId, provider_checkout_id: providerCheckoutId,
        amount_cents: amountCents, currency },
      p_last_error: reason,
    });
    // A failed audit write must be retried by the adapter.
    return json({ error: reason, reconciliation_required: true }, logError ? 503 : 409);
  }

  const { data: receipt, error: receiptError } = await admin.from("payment_webhook_events")
    .select("order_id,status,payload")
    .eq("provider", provider).eq("provider_event_id", eventId).maybeSingle();
  if (receiptError) return json({ error: "Payment receipt lookup unavailable" }, 503);
  if (receipt) {
    if (isCommittedReplay(event, receipt)) return json({ ok: true, replay: true });
    return reconciliationRequired("Payment event identifier conflicts with an existing receipt");
  }

  const { data: checkout, error: checkoutError } = await admin
    .from("checkout_session_summary")
    .select("checkout_status,order_status,payment_provider,provider_checkout_id,total_cents,currency")
    .eq("order_id", orderId)
    .maybeSingle();

  if (checkoutError) return json({ error: "Checkout lookup unavailable" }, 503);
  if (!checkout ||
    checkout.payment_provider !== provider ||
    checkout.provider_checkout_id !== providerCheckoutId ||
    checkout.total_cents !== amountCents ||
    checkout.currency !== currency ||
    !["provider_pending", "completed"].includes(checkout.checkout_status ?? "") ||
    !["pending_payment", "paid"].includes(checkout.order_status ?? "")) {
    return reconciliationRequired("Payment event does not match an active checkout");
  }

  const { error } = await admin.rpc("mark_order_paid_from_provider", {
    p_order_id: orderId,
    p_provider: provider,
    p_provider_payment_id: paymentId,
    p_provider_customer_id: customerId,
    p_provider_event_id: eventId,
    p_event_type: eventType,
    p_shipping_name: shippingName,
    p_shipping_address: shippingAddress,
    p_payload: body,
  });

  if (error) {
    await admin.rpc("update_integration_provider_health", {
      p_provider_key: "commerce-primary",
      p_status: "error",
      p_health_status: "degraded",
      p_success: false,
      p_error: error.message,
    });

    return reconciliationRequired("Payment could not be applied to the order. Operations review is required.");
  }

  // Re-read after the transaction: another delivery can claim the same event
  // between the initial lookup and the database's atomic idempotency check.
  const { data: committed, error: committedError } = await admin.from("payment_webhook_events")
    .select("order_id,status,payload")
    .eq("provider", provider).eq("provider_event_id", eventId).maybeSingle();
  if (committedError) return json({ error: "Payment confirmation lookup unavailable" }, 503);
  if (!committed || !isCommittedReplay(event, committed)) {
    return reconciliationRequired("Payment receipt was not confirmed for this event");
  }

  await admin.rpc("update_integration_provider_health", {
    p_provider_key: "commerce-primary",
    p_status: "active",
    p_health_status: "healthy",
    p_success: true,
    p_error: null,
  });

  return json({ ok: true });
});
