import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

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

  if (session.checkout_status !== "created") {
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

  let response: Response;
  let responseBody: Record<string, unknown> = {};

  try {
    response = await fetch(trustedAdapterUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adapterSecret}`,
      },
      body: JSON.stringify(requestPayload),
    });
    responseBody = await response.json().catch(() => ({}));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await admin.rpc("record_integration_event", {
      p_provider_key: "commerce-primary",
      p_event_type: "checkout_create",
      p_direction: "outbound",
      p_entity_type: "checkout_session",
      p_entity_id: session.checkout_session_id,
      p_status: "failed",
      p_idempotency_key: `checkout:${session.checkout_session_id}`,
      p_request_payload: requestPayload,
      p_last_error: message,
    });

    await admin.rpc("update_integration_provider_health", {
      p_provider_key: "commerce-primary",
      p_status: "error",
      p_health_status: "down",
      p_success: false,
      p_error: message,
    });

    return json({ error: "Checkout provider could not be reached." }, 502, origin);
  }

  if (!response.ok) {
    await admin.rpc("record_integration_event", {
      p_provider_key: "commerce-primary",
      p_event_type: "checkout_create",
      p_direction: "outbound",
      p_entity_type: "checkout_session",
      p_entity_id: session.checkout_session_id,
      p_status: "failed",
      p_idempotency_key: `checkout:${session.checkout_session_id}`,
      p_request_payload: requestPayload,
      p_response_payload: responseBody,
      p_last_error: JSON.stringify(responseBody),
    });

    await admin.rpc("update_integration_provider_health", {
      p_provider_key: "commerce-primary",
      p_status: "error",
      p_health_status: response.status >= 500 ? "down" : "degraded",
      p_success: false,
      p_error: JSON.stringify(responseBody),
    });

    return json({ error: "Checkout provider rejected the request." }, 502, origin);
  }

  const checkoutUrl =
    typeof responseBody.checkout_url === "string" ? responseBody.checkout_url : "";
  const providerCheckoutId =
    typeof responseBody.provider_checkout_id === "string"
      ? responseBody.provider_checkout_id
      : "";

  let hostedUrl: URL | null = null;
  try {
    hostedUrl = checkoutUrl ? new URL(checkoutUrl) : null;
  } catch {
    // Invalid or relative URLs must never be forwarded to a guardian browser.
  }

  if (!providerCheckoutId.trim() || hostedUrl?.protocol !== "https:" ||
    hostedUrl.username || hostedUrl.password) {
    return json({ error: "Checkout adapter returned an invalid response." }, 502, origin);
  }

  const { error: handoffError } = await userClient.rpc(
    "begin_checkout_provider_handoff",
    {
      p_checkout_session_id: session.checkout_session_id,
      p_provider: provider,
      p_provider_checkout_id: providerCheckoutId,
    },
  );

  if (handoffError) {
    return json({ error: handoffError.message }, 409, origin);
  }

  await admin.rpc("record_integration_event", {
    p_provider_key: "commerce-primary",
    p_event_type: "checkout_create",
    p_direction: "outbound",
    p_entity_type: "checkout_session",
    p_entity_id: session.checkout_session_id,
    p_status: "succeeded",
    p_idempotency_key: `checkout:${session.checkout_session_id}`,
    p_request_payload: {
      order_id: session.order_id,
      total_cents: session.total_cents,
      currency: session.currency,
    },
    p_response_payload: {
      provider_checkout_id: providerCheckoutId,
    },
  });

  await admin.rpc("update_integration_provider_health", {
    p_provider_key: "commerce-primary",
    p_status: "active",
    p_health_status: "healthy",
    p_success: true,
    p_error: null,
  });

  return json(
    {
      ok: true,
      checkout_url: hostedUrl.toString(),
      provider_checkout_id: providerCheckoutId,
      order_number: session.order_number,
    },
    200,
    origin,
  );
});
