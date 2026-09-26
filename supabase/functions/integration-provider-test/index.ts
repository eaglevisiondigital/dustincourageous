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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Authentication required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const publishableKey = publishableKeys.default as string | undefined;
  const secretKey = secretKeys.default as string | undefined;

  if (!supabaseUrl || !publishableKey || !secretKey) {
    return json({ error: "Service configuration unavailable" }, 503);
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
    return json({ error: "Authentication required" }, 401);
  }

  const { data: adminRole, error: roleError } = await userClient
    .from("app_admins")
    .select("role,status")
    .eq("user_id", authData.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (
    roleError ||
    !adminRole ||
    !["super_admin", "operations_admin"].includes(adminRole.role)
  ) {
    return json({ error: "Operations administrator access required" }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const providerKey = String(body?.provider_key ?? "");

  if (
    !["email-primary", "push-primary", "commerce-primary", "goodbarber-app"].includes(
      providerKey,
    )
  ) {
    return json({ error: "Unsupported provider test" }, 400);
  }

  const { data: provider } = await admin
    .from("integration_providers")
    .select("id,provider_key,provider_type,display_name")
    .eq("provider_key", providerKey)
    .maybeSingle();

  const { data: testRun, error: runError } = await admin
    .from("integration_test_runs")
    .insert({
      provider_id: provider?.id ?? null,
      provider_key: providerKey,
      test_type: "connectivity",
      requested_by: authData.user.id,
      status: "running",
      metadata: { safe_test: true, no_live_customer_action: true },
    })
    .select("id")
    .single();

  if (runError || !testRun) {
    return json({ error: runError?.message || "Could not start provider test" }, 500);
  }

  async function finish(
    status: "passed" | "failed" | "not_configured",
    summary: string,
    errorMessage: string | null = null,
    providerStatus?: string,
    providerHealth?: string,
  ) {
    await admin
      .from("integration_test_runs")
      .update({
        status,
        completed_at: new Date().toISOString(),
        response_summary: summary,
        error_message: errorMessage,
      })
      .eq("id", testRun.id);

    await admin.rpc("update_integration_provider_health", {
      p_provider_key: providerKey,
      p_status:
        providerStatus ??
        (status === "passed"
          ? "configured"
          : status === "not_configured"
            ? "not_configured"
            : "error"),
      p_health_status:
        providerHealth ??
        (status === "passed"
          ? "healthy"
          : status === "not_configured"
            ? "unknown"
            : "degraded"),
      p_success: status === "passed" ? true : status === "failed" ? false : null,
      p_error: errorMessage,
    });

    return json({
      ok: status === "passed",
      status,
      provider_key: providerKey,
      summary,
      test_run_id: testRun.id,
    });
  }

  try {
    if (providerKey === "email-primary") {
      const providerName = (Deno.env.get("DC_EMAIL_PROVIDER") ?? "").toLowerCase();

      if (providerName !== "resend") {
        return await finish(
          "not_configured",
          "No supported email provider is configured.",
        );
      }

      const resendKey = Deno.env.get("RESEND_API_KEY");
      const emailFrom = Deno.env.get("DC_EMAIL_FROM");

      if (!resendKey || !emailFrom) {
        return await finish(
          "not_configured",
          "Resend is selected, but required email credentials/from-address are incomplete.",
        );
      }

      const response = await fetch("https://api.resend.com/domains", {
        method: "GET",
        headers: { Authorization: `Bearer ${resendKey}` },
      });

      if (!response.ok) {
        return await finish(
          "failed",
          "Read-only Resend credential check failed.",
          `Provider returned HTTP ${response.status}`,
        );
      }

      return await finish(
        "passed",
        "Read-only email provider credential check passed. No email was sent.",
        null,
        "configured",
        "healthy",
      );
    }

    if (providerKey === "push-primary") {
      const providerName = (Deno.env.get("DC_PUSH_PROVIDER") ?? "").toLowerCase();
      const adapterUrl = Deno.env.get("DC_PUSH_WEBHOOK_URL");
      const adapterSecret = Deno.env.get("DC_PUSH_WEBHOOK_SECRET");

      if (providerName !== "webhook" || !adapterUrl) {
        return await finish(
          "not_configured",
          "No push adapter webhook is configured.",
        );
      }

      const response = await fetch(adapterUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adapterSecret ? { Authorization: `Bearer ${adapterSecret}` } : {}),
        },
        body: JSON.stringify({
          event: "dc.integration.test",
          provider: "push",
          test_mode: true,
          send_notification: false,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.test_mode !== true || result?.ok !== true) {
        return await finish(
          "failed",
          "Push adapter did not explicitly confirm safe test mode.",
          response.ok
            ? "Adapter response must include ok=true and test_mode=true."
            : `Adapter returned HTTP ${response.status}`,
        );
      }

      return await finish(
        "passed",
        "Push adapter confirmed safe test mode. No family push notification was sent.",
        null,
        "configured",
        "healthy",
      );
    }

    if (providerKey === "commerce-primary") {
      const providerName = (Deno.env.get("DC_COMMERCE_PROVIDER") ?? "").toLowerCase();
      const adapterUrl = Deno.env.get("DC_COMMERCE_CHECKOUT_ADAPTER_URL");
      const adapterSecret = Deno.env.get("DC_COMMERCE_CHECKOUT_ADAPTER_SECRET");

      if (providerName !== "webhook" || !adapterUrl) {
        return await finish(
          "not_configured",
          "No hosted checkout adapter is configured.",
        );
      }

      const response = await fetch(adapterUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adapterSecret ? { Authorization: `Bearer ${adapterSecret}` } : {}),
        },
        body: JSON.stringify({
          event: "dc.integration.test",
          provider: "commerce",
          test_mode: true,
          create_checkout: false,
          create_charge: false,
          amount_cents: 0,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.test_mode !== true || result?.ok !== true) {
        return await finish(
          "failed",
          "Commerce adapter did not explicitly confirm safe test mode.",
          response.ok
            ? "Adapter response must include ok=true and test_mode=true."
            : `Adapter returned HTTP ${response.status}`,
        );
      }

      return await finish(
        "passed",
        "Commerce adapter confirmed safe test mode. No checkout or charge was created.",
        null,
        "configured",
        "healthy",
      );
    }

    const { count, error: countError } = await admin
      .from("app_installations")
      .select("id", { count: "exact", head: true })
      .eq("app_channel", "goodbarber")
      .eq("is_active", true);

    if (countError) throw countError;

    if ((count ?? 0) === 0) {
      return await finish(
        "not_configured",
        "No active GoodBarber installation has registered with Adventure Club yet.",
      );
    }

    return await finish(
      "passed",
      `${count} active GoodBarber installation(s) are registered against Supabase.`,
      null,
      "configured",
      "healthy",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return await finish(
      "failed",
      "Provider connectivity test failed.",
      message,
    );
  }
});
