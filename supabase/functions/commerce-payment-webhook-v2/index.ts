import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

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

  const body = await req.json().catch(() => ({}));

  const provider = String(body?.provider ?? "");
  const eventId = String(body?.event_id ?? "");
  const eventType = String(body?.event_type ?? "payment_succeeded");
  const orderId = String(body?.order_id ?? "");
  const paymentId = String(body?.payment_id ?? "");
  const providerCheckoutId = String(body?.provider_checkout_id ?? "");
  const amountCents = body?.amount_cents;
  const currency = String(body?.currency ?? "").toUpperCase();
  const customerId = body?.customer_id ? String(body.customer_id) : null;
  const shippingName = body?.shipping_name ? String(body.shipping_name) : null;
  const shippingAddress =
    body?.shipping_address && typeof body.shipping_address === "object"
      ? body.shipping_address
      : null;
  const status = String(body?.status ?? "");

  if (!provider || !eventId || !orderId || !paymentId) {
    return json({ error: "Missing required payment event fields" }, 400);
  }

  if (status !== "paid") {
    await admin
      .from("payment_webhook_events")
      .upsert(
        {
          provider,
          provider_event_id: eventId,
          event_type: eventType,
          order_id: orderId,
          status: "ignored",
          payload: body,
          processed_at: new Date().toISOString(),
        },
        { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
      );

    return json({ ok: true, ignored: true });
  }

  if (!providerCheckoutId || !Number.isSafeInteger(amountCents) || amountCents < 0 || !currency) {
    return json({ error: "Missing checkout or payment amount verification fields" }, 400);
  }

  const { data: checkout, error: checkoutError } = await admin
    .from("checkout_session_summary")
    .select("checkout_status,order_status,payment_provider,provider_checkout_id,total_cents,currency")
    .eq("order_id", orderId)
    .maybeSingle();

  if (checkoutError || !checkout ||
    checkout.payment_provider !== provider ||
    checkout.provider_checkout_id !== providerCheckoutId ||
    checkout.total_cents !== amountCents ||
    checkout.currency !== currency ||
    !["provider_pending", "completed"].includes(checkout.checkout_status ?? "") ||
    !["pending_payment", "paid"].includes(checkout.order_status ?? "")) {
    return json({ error: "Payment event does not match an active checkout" }, 409);
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

    return json({ error: error.message }, 409);
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
