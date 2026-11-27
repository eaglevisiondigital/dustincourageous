import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import { handoffCheckout } from "./handoff.ts";

function allowedOrigin(origin: string | null) {
  if (!origin) return false;
  return origin === "https://dustincourageous.com" ||
    origin === "https://www.dustincourageous.com" ||
    origin === "http://localhost:5173" ||
    origin === "https://dustincourageous.netlify.app" ||
    /^https:\/\/[a-z0-9-]+--dustincourageous\.netlify\.app$/.test(origin);
}

function cors(origin: string | null) {
  const allowed = allowedOrigin(origin);

  return {
    "Access-Control-Allow-Origin": allowed ? origin! : "https://dustincourageous.com",
    "Access-Control-Allow-Headers": "authorization,content-type,apikey",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors(origin),
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(origin) });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Authentication required" }, 401, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const publishableKey = publishableKeys.default as string | undefined;
  const secretKey = secretKeys.default as string | undefined;

  if (!supabaseUrl || !publishableKey || !secretKey) {
    return json({ error: "Service configuration unavailable" }, 503, origin);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: authData, error: authError } = await userClient.auth.getUser(token);

  if (authError || !authData.user) {
    return json({ error: "Authentication required" }, 401, origin);
  }

  const body = await req.json().catch(() => ({}));
  const checkoutSessionId = String(body?.checkout_session_id ?? "");

  if (!checkoutSessionId) {
    return json({ error: "checkout_session_id is required" }, 400, origin);
  }

  const { data: session, error: sessionError } = await userClient
    .from("checkout_session_summary")
    .select("*")
    .eq("checkout_session_id", checkoutSessionId)
    .single();

  if (sessionError || !session) {
    return json({ error: "Checkout session not found" }, 404, origin);
  }

  if (session.user_id !== authData.user.id) {
    return json({ error: "Checkout session not found" }, 404, origin);
  }

  if (!["created", "provider_pending"].includes(session.checkout_status)) {
    return json({ error: "Checkout session is not available" }, 409, origin);
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    return json({ error: "Checkout session expired" }, 409, origin);
  }

  const { data: items, error: itemError } = await userClient
    .from("order_items")
    .select("id,quantity,unit_price_cents,line_total_cents,product_name_snapshot,variant_name_snapshot,sku_snapshot")
    .eq("order_id", session.order_id)
    .order("created_at");

  if (itemError) {
    return json({ error: itemError.message }, 500, origin);
  }

  const provider = (Deno.env.get("DC_COMMERCE_PROVIDER") ?? "").toLowerCase();
  const adapterUrl = Deno.env.get("DC_COMMERCE_CHECKOUT_ADAPTER_URL");
  const adapterSecret = Deno.env.get("DC_COMMERCE_CHECKOUT_ADAPTER_SECRET");

  let trustedAdapterUrl: URL | null = null;
  try {
    trustedAdapterUrl = adapterUrl ? new URL(adapterUrl) : null;
  } catch {
    // A malformed adapter address is treated as an unconfigured provider.
  }

  if (provider !== "webhook" || !adapterSecret ||
    trustedAdapterUrl?.protocol !== "https:" ||
    trustedAdapterUrl.username || trustedAdapterUrl.password) {
    await admin.rpc("update_integration_provider_health", {
      p_provider_key: "commerce-primary",
      p_status: "not_configured",
      p_health_status: "unknown",
      p_success: null,
      p_error: null,
    });

    return json(
      {
        error: "Checkout provider is not configured yet.",
        code: "provider_not_configured",
      },
      409,
      origin,
    );
  }

  const requestPayload = {
    event: "dc.checkout.create",
    checkout_session_id: session.checkout_session_id,
    order_id: session.order_id,
    order_number: session.order_number,
    user_id: authData.user.id,
    household_id: session.household_id,
    amount: {
      subtotal_cents: session.subtotal_cents,
      discount_cents: session.discount_cents,
      shipping_cents: session.shipping_cents,
      tax_cents: session.tax_cents,
      total_cents: session.total_cents,
      currency: session.currency,
    },
    items: items ?? [],
    return_urls: {
      success: (allowedOrigin(origin) ? origin : "https://dustincourageous.com") + "/?checkout=success",
      cancel: (allowedOrigin(origin) ? origin : "https://dustincourageous.com") + "/?checkout=canceled",
    },
  };

  const result = await handoffCheckout({
    userClient, admin, sessionId: session.checkout_session_id, provider,
    adapterUrl: trustedAdapterUrl.toString(), adapterSecret,
    expiresAt: session.expires_at, payload: requestPayload,
  });

  // Never log raw adapter bodies, credentials, checkout URLs or network errors.
  // The private durable attempt is the reconciliation record. Telemetry cannot
  // invalidate a completed handoff or force a second external dispatch.
  try {
    await admin.rpc("record_integration_event", {
      p_provider_key: "commerce-primary", p_event_type: "checkout_create",
      p_direction: "outbound", p_entity_type: "checkout_session",
      p_entity_id: session.checkout_session_id,
      p_status: result.status === 200 ? "succeeded" : "failed",
      p_idempotency_key: `checkout:${session.checkout_session_id}`,
      p_last_error: result.status === 200 ? null : "handoff_pending_confirmation",
    });
    if (result.status === 200) {
      await admin.rpc("update_integration_provider_health", {
        p_provider_key: "commerce-primary", p_status: "active", p_health_status: "healthy",
        p_success: true, p_error: null,
      });
    }
  } catch { /* Keep the durable handoff result authoritative. */ }
  return json({ ...result.body, ...(result.status === 200 ? { order_number: session.order_number } : {}) }, result.status, origin);
});
