import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

function cors(origin: string | null) {
  const allowed =
    !!origin &&
    (
      origin === "https://dustincourageous.com" ||
      origin === "https://www.dustincourageous.com" ||
      origin.endsWith(".netlify.app") ||
      origin.startsWith("http://localhost:")
    );

  return {
    "Access-Control-Allow-Origin": allowed ? origin! : "https://dustincourageous.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin"
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers });
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const publishableKey = publishableKeys.default;
  const secretKey = secretKeys.default;

  if (!projectUrl || !publishableKey || !secretKey) {
    return new Response(JSON.stringify({ error: "Service unavailable" }), { status: 503, headers });
  }

  const userClient = createClient(projectUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const adminClient = createClient(projectUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers });
  }

  let body: { action?: string; request_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers });
  }

  const action = body.action ?? "download";
  const requestId = body.request_id;

  if (!requestId) {
    return new Response(JSON.stringify({ error: "request_id is required" }), { status: 400, headers });
  }

  const { data: requestRow, error: requestError } = await userClient
    .from("data_privacy_requests")
    .select("id,household_id,request_type,status,export_reference,export_expires_at")
    .eq("id", requestId)
    .single();

  if (requestError || !requestRow) {
    return new Response(JSON.stringify({ error: "Privacy request not found or inaccessible" }), { status: 404, headers });
  }

  if (!["export_household", "export_child"].includes(requestRow.request_type)) {
    return new Response(JSON.stringify({ error: "This privacy request is not an export request" }), { status: 400, headers });
  }

  if (["canceled", "rejected"].includes(requestRow.status)) {
    return new Response(JSON.stringify({ error: "This privacy request is no longer active" }), { status: 409, headers });
  }

  if (action === "generate") {
    const { data: payload, error: payloadError } = await userClient.rpc("privacy_export_payload", {
      p_request_id: requestId
    });

    if (payloadError || !payload) {
      return new Response(
        JSON.stringify({ error: payloadError?.message ?? "Unable to assemble export" }),
        { status: 400, headers }
      );
    }

    const objectPath =
      requestRow.household_id + "/" +
      requestId + "/dc-adventure-club-data-" +
      new Date().toISOString().replace(/[:.]/g, "-") +
      ".json";

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });

    const { error: uploadError } = await adminClient.storage
      .from("privacy-exports")
      .upload(objectPath, blob, {
        contentType: "application/json",
        cacheControl: "no-store",
        upsert: false
      });

    if (uploadError) {
      console.error("privacy export upload failed", uploadError);
      return new Response(JSON.stringify({ error: "Unable to store export" }), { status: 500, headers });
    }

    const availableUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await adminClient
      .from("data_privacy_requests")
      .update({
        status: "ready",
        export_reference: objectPath,
        export_expires_at: availableUntil
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("privacy request update failed", updateError);
      return new Response(JSON.stringify({ error: "Export was created but request status could not be updated" }), {
        status: 500,
        headers
      });
    }

    const { data: signed, error: signedError } = await adminClient.storage
      .from("privacy-exports")
      .createSignedUrl(objectPath, 900, { download: "dustin-courageous-adventure-club-data.json" });

    if (signedError || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: "Export created, but download link could not be signed" }), {
        status: 500,
        headers
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status: "ready",
        signed_url: signed.signedUrl,
        signed_url_expires_in: 900,
        export_available_until: availableUntil
      }),
      { status: 200, headers }
    );
  }

  if (action === "download") {
    if (!requestRow.export_reference) {
      return new Response(JSON.stringify({ error: "Export has not been generated yet" }), { status: 409, headers });
    }

    if (requestRow.export_expires_at && new Date(requestRow.export_expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ error: "This export download window has expired. Generate a new export." }),
        { status: 410, headers }
      );
    }

    const { data: signed, error: signedError } = await adminClient.storage
      .from("privacy-exports")
      .createSignedUrl(requestRow.export_reference, 900, {
        download: "dustin-courageous-adventure-club-data.json"
      });

    if (signedError || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: "Unable to create download link" }), { status: 500, headers });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status: requestRow.status,
        signed_url: signed.signedUrl,
        signed_url_expires_in: 900,
        export_available_until: requestRow.export_expires_at
      }),
      { status: 200, headers }
    );
  }

  return new Response(JSON.stringify({ error: "Unsupported action" }), { status: 400, headers });
});
