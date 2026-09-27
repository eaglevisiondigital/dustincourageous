import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

type ClaimedDelivery = {
  delivery_id: string;
  notification_id: string;
  user_id: string;
  channel: "email" | "push";
  attempt_count: number;
};

type Payload = {
  delivery_id: string;
  notification_id: string;
  user_id: string;
  channel: "email" | "push";
  notification_type: string;
  title: string;
  body: string;
  deep_link: string | null;
  priority: string;
  metadata: Record<string, unknown>;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
const defaultSecret = secretKeys.default as string | undefined;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function inQuietHours(
  start: string | null,
  end: string | null,
  timezone: string | null,
) {
  if (!start || !end) return false;

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "America/Chicago",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date())
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );

    const nowMinutes = Number(parts.hour) * 60 + Number(parts.minute);
    const [startHour, startMinute] = start.slice(0, 5).split(":").map(Number);
    const [endHour, endMinute] = end.slice(0, 5).split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes === endMinutes) return false;
    if (startMinutes < endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    }
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const providedKey = req.headers.get("apikey");
  const validSecrets = Object.values(secretKeys).filter(Boolean);

  if (!providedKey || !validSecrets.includes(providedKey)) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!supabaseUrl || !defaultSecret) {
    return json({ error: "Supabase secret configuration unavailable" }, 503);
  }

  const admin = createClient(supabaseUrl, defaultSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const requestBody = await req.json().catch(() => ({}));
  const requestedLimit = Number(requestBody?.limit ?? 50);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 50, 200));

  const { data: run, error: runError } = await admin
    .from("delivery_worker_runs")
    .insert({
      worker_key: "notification-delivery-worker",
      status: "running",
      metadata: { requested_limit: limit },
    })
    .select("id")
    .single();

  if (runError || !run) {
    return json({ error: runError?.message || "Could not start worker run" }, 500);
  }

  let sent = 0;
  let failed = 0;
  let suppressed = 0;

  try {
    const { data: claimedData, error: claimError } = await admin.rpc(
      "claim_notification_deliveries",
      { p_limit: limit },
    );

    if (claimError) throw claimError;

    const claimed = (claimedData ?? []) as ClaimedDelivery[];

    await admin
      .from("delivery_worker_runs")
      .update({ claimed_count: claimed.length })
      .eq("id", run.id);

    for (const delivery of claimed) {
      const providerKey =
        delivery.channel === "email" ? "email-primary" : "push-primary";

      try {
        const { data: payloadRows, error: payloadError } = await admin.rpc(
          "get_notification_delivery_payload",
          { p_delivery_id: delivery.delivery_id },
        );
        if (payloadError) throw payloadError;

        const payload = (payloadRows?.[0] ?? null) as Payload | null;
        if (!payload) throw new Error("Notification payload not found");

        const { data: preference } = await admin
          .from("notification_preferences")
          .select(
            "email_enabled,push_enabled,quiet_hours_start,quiet_hours_end,timezone",
          )
          .eq("user_id", delivery.user_id)
          .maybeSingle();

        const enabled =
          delivery.channel === "email"
            ? preference?.email_enabled !== false
            : preference?.push_enabled !== false;

        if (!enabled) {
          await admin.rpc("complete_notification_delivery", {
            p_delivery_id: delivery.delivery_id,
            p_status: "suppressed",
            p_provider: providerKey,
            p_last_error: "channel_disabled_by_guardian",
            p_metadata: { suppression_reason: "guardian_preference" },
          });
          suppressed += 1;
          continue;
        }

        if (
          inQuietHours(
            preference?.quiet_hours_start ?? null,
            preference?.quiet_hours_end ?? null,
            preference?.timezone ?? null,
          )
        ) {
          await admin.rpc("complete_notification_delivery", {
            p_delivery_id: delivery.delivery_id,
            p_status: "queued",
            p_provider: providerKey,
            p_last_error: "quiet_hours",
            p_retry_minutes: 60,
            p_metadata: { deferred_reason: "quiet_hours" },
          });
          continue;
        }

        if (delivery.channel === "email") {
          const emailProvider = (Deno.env.get("DC_EMAIL_PROVIDER") ?? "").toLowerCase();
          const resendKey = Deno.env.get("RESEND_API_KEY");
          const emailFrom = Deno.env.get("DC_EMAIL_FROM");

          if (emailProvider !== "resend" || !resendKey || !emailFrom) {
            await admin.rpc("complete_notification_delivery", {
              p_delivery_id: delivery.delivery_id,
              p_status: "suppressed",
              p_provider: "email-primary",
              p_last_error: "email_provider_not_configured",
              p_metadata: { suppression_reason: "provider_not_configured" },
            });
            await admin.rpc("update_integration_provider_health", {
              p_provider_key: "email-primary",
              p_status: "not_configured",
              p_health_status: "unknown",
              p_success: null,
              p_error: null,
            });
            suppressed += 1;
            continue;
          }

          const {
            data: { user },
            error: userError,
          } = await admin.auth.admin.getUserById(delivery.user_id);

          if (userError || !user?.email) {
            await admin.rpc("complete_notification_delivery", {
              p_delivery_id: delivery.delivery_id,
              p_status: "suppressed",
              p_provider: "resend",
              p_last_error: "guardian_email_unavailable",
              p_metadata: { suppression_reason: "no_email" },
            });
            suppressed += 1;
            continue;
          }

          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: emailFrom,
              to: [user.email],
              subject: payload.title,
              text: [
                payload.body,
                payload.deep_link
                  ? `\nOpen Adventure Club: ${payload.deep_link}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n"),
            }),
          });

          const responseBody = await response.json().catch(() => ({}));
          const integrationId = `notification:${delivery.delivery_id}:email:${delivery.attempt_count}`;

          if (response.ok) {
            await admin.rpc("complete_notification_delivery", {
              p_delivery_id: delivery.delivery_id,
              p_status: "sent",
              p_provider: "resend",
              p_provider_message_id: responseBody?.id ?? null,
              p_metadata: { provider_response: responseBody },
            });
            await admin.rpc("record_integration_event", {
              p_provider_key: "email-primary",
              p_event_type: "notification_delivery",
              p_direction: "outbound",
              p_entity_type: "notification_delivery",
              p_entity_id: delivery.delivery_id,
              p_status: "succeeded",
              p_idempotency_key: integrationId,
              p_request_payload: {
                notification_id: payload.notification_id,
                user_id: payload.user_id,
              },
              p_response_payload: responseBody,
            });
            await admin.rpc("update_integration_provider_health", {
              p_provider_key: "email-primary",
              p_status: "active",
              p_health_status: "healthy",
              p_success: true,
              p_error: null,
            });
            sent += 1;
          } else {
            const retryable = response.status === 429 || response.status >= 500;
            await admin.rpc("complete_notification_delivery", {
              p_delivery_id: delivery.delivery_id,
              p_status: retryable && delivery.attempt_count < 5 ? "queued" : "failed",
              p_provider: "resend",
              p_last_error: JSON.stringify(responseBody),
              p_retry_minutes: Math.min(60, Math.max(5, delivery.attempt_count * 10)),
              p_metadata: { http_status: response.status },
            });
            await admin.rpc("record_integration_event", {
              p_provider_key: "email-primary",
              p_event_type: "notification_delivery",
              p_direction: "outbound",
              p_entity_type: "notification_delivery",
              p_entity_id: delivery.delivery_id,
              p_status: "failed",
              p_idempotency_key: integrationId,
              p_request_payload: {
                notification_id: payload.notification_id,
                user_id: payload.user_id,
              },
              p_response_payload: responseBody,
              p_last_error: JSON.stringify(responseBody),
            });
            await admin.rpc("update_integration_provider_health", {
              p_provider_key: "email-primary",
              p_status: "error",
              p_health_status: retryable ? "degraded" : "down",
              p_success: false,
              p_error: JSON.stringify(responseBody),
            });
            if (!retryable || delivery.attempt_count >= 5) failed += 1;
          }
        } else {
          const pushProvider = (Deno.env.get("DC_PUSH_PROVIDER") ?? "").toLowerCase();
          const pushUrl = Deno.env.get("DC_PUSH_WEBHOOK_URL");
          const pushSecret = Deno.env.get("DC_PUSH_WEBHOOK_SECRET");

          const { data: devices, error: deviceError } = await admin
            .from("push_devices")
            .select("id,provider,device_token,platform,app_version")
            .eq("user_id", delivery.user_id)
            .eq("is_active", true)
            .order("last_seen_at", { ascending: false });

          if (deviceError) throw deviceError;

          if (!devices?.length) {
            await admin.rpc("complete_notification_delivery", {
              p_delivery_id: delivery.delivery_id,
              p_status: "suppressed",
              p_provider: "push-primary",
              p_last_error: "no_active_push_device",
              p_metadata: { suppression_reason: "no_device" },
            });
            suppressed += 1;
            continue;
          }

          if (pushProvider !== "webhook" || !pushUrl) {
            await admin.rpc("complete_notification_delivery", {
              p_delivery_id: delivery.delivery_id,
              p_status: "suppressed",
              p_provider: "push-primary",
              p_last_error: "push_provider_not_configured",
              p_metadata: { suppression_reason: "provider_not_configured" },
            });
            await admin.rpc("update_integration_provider_health", {
              p_provider_key: "push-primary",
              p_status: "not_configured",
              p_health_status: "unknown",
              p_success: null,
              p_error: null,
            });
            suppressed += 1;
            continue;
          }

          const response = await fetch(pushUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(pushSecret ? { Authorization: `Bearer ${pushSecret}` } : {}),
            },
            body: JSON.stringify({
              event: "dc.notification",
              delivery_id: delivery.delivery_id,
              user_id: delivery.user_id,
              devices,
              notification: {
                title: payload.title,
                body: payload.body,
                deep_link: payload.deep_link,
                priority: payload.priority,
                type: payload.notification_type,
              },
            }),
          });

          const responseBody = await response.json().catch(() => ({}));
          const integrationId = `notification:${delivery.delivery_id}:push:${delivery.attempt_count}`;

          if (response.ok) {
            await admin.rpc("complete_notification_delivery", {
              p_delivery_id: delivery.delivery_id,
              p_status: "sent",
              p_provider: "push-webhook",
              p_provider_message_id:
                responseBody?.id ?? responseBody?.message_id ?? null,
              p_metadata: { provider_response: responseBody },
            });
            await admin.rpc("record_integration_event", {
              p_provider_key: "push-primary",
              p_event_type: "notification_delivery",
              p_direction: "outbound",
              p_entity_type: "notification_delivery",
              p_entity_id: delivery.delivery_id,
              p_status: "succeeded",
              p_idempotency_key: integrationId,
              p_request_payload: {
                notification_id: payload.notification_id,
                user_id: payload.user_id,
                device_count: devices.length,
              },
              p_response_payload: responseBody,
            });
            await admin.rpc("update_integration_provider_health", {
              p_provider_key: "push-primary",
              p_status: "active",
              p_health_status: "healthy",
              p_success: true,
              p_error: null,
            });
            sent += 1;
          } else {
            const retryable = response.status === 429 || response.status >= 500;
            await admin.rpc("complete_notification_delivery", {
              p_delivery_id: delivery.delivery_id,
              p_status: retryable && delivery.attempt_count < 5 ? "queued" : "failed",
              p_provider: "push-webhook",
              p_last_error: JSON.stringify(responseBody),
              p_retry_minutes: Math.min(60, Math.max(5, delivery.attempt_count * 10)),
              p_metadata: { http_status: response.status },
            });
            await admin.rpc("record_integration_event", {
              p_provider_key: "push-primary",
              p_event_type: "notification_delivery",
              p_direction: "outbound",
              p_entity_type: "notification_delivery",
              p_entity_id: delivery.delivery_id,
              p_status: "failed",
              p_idempotency_key: integrationId,
              p_request_payload: {
                notification_id: payload.notification_id,
                user_id: payload.user_id,
                device_count: devices.length,
              },
              p_response_payload: responseBody,
              p_last_error: JSON.stringify(responseBody),
            });
            await admin.rpc("update_integration_provider_health", {
              p_provider_key: "push-primary",
              p_status: "error",
              p_health_status: retryable ? "degraded" : "down",
              p_success: false,
              p_error: JSON.stringify(responseBody),
            });
            if (!retryable || delivery.attempt_count >= 5) failed += 1;
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const retry = delivery.attempt_count < 5;

        await admin.rpc("complete_notification_delivery", {
          p_delivery_id: delivery.delivery_id,
          p_status: retry ? "queued" : "failed",
          p_provider: providerKey,
          p_last_error: message,
          p_retry_minutes: Math.min(60, Math.max(5, delivery.attempt_count * 10)),
          p_metadata: { worker_exception: true },
        });

        if (!retry) failed += 1;
      }
    }

    const finalStatus = failed > 0 ? "partial" : "succeeded";

    await admin
      .from("delivery_worker_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: finalStatus,
        sent_count: sent,
        failed_count: failed,
        suppressed_count: suppressed,
      })
      .eq("id", run.id);

    return json({
      ok: true,
      run_id: run.id,
      claimed: claimed.length,
      sent,
      failed,
      suppressed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await admin
      .from("delivery_worker_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "failed",
        sent_count: sent,
        failed_count: failed,
        suppressed_count: suppressed,
        error_message: message,
      })
      .eq("id", run.id);

    return json({ error: message, run_id: run.id }, 500);
  }
});
