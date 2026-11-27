import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const serviceKey = secretKeys.default;

  if (!projectUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Service unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  const cleanupSecret = req.headers.get("x-cleanup-secret") ?? "";

  const admin = createClient(projectUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: verified, error: verifyError } = await admin.rpc(
    "verify_privacy_cleanup_secret",
    { p_secret: cleanupSecret }
  );

  if (verifyError || verified !== true) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { data: requests, error: requestError } = await admin
    .from("data_privacy_requests")
    .select("id,export_reference")
    .eq("status", "ready")
    .not("export_reference", "is", null)
    .lt("export_expires_at", new Date().toISOString())
    .limit(500);

  if (requestError) {
    console.error("privacy cleanup query failed", requestError);
    return new Response(JSON.stringify({ error: "Cleanup query failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  let removed = 0;
  let failed = 0;

  for (const row of requests ?? []) {
    const objectPath = row.export_reference as string;

    const { error: removeError } = await admin.storage
      .from("privacy-exports")
      .remove([objectPath]);

    if (removeError) {
      console.error("privacy export delete failed", row.id, removeError);
      failed += 1;
      continue;
    }

    const { error: updateError } = await admin
      .from("data_privacy_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        export_reference: null,
        export_expires_at: null,
        metadata: {
          export_cleanup: "expired_file_removed"
        }
      })
      .eq("id", row.id);

    if (updateError) {
      console.error("privacy request completion update failed", row.id, updateError);
      failed += 1;
      continue;
    }

    removed += 1;
  }

  return new Response(
    JSON.stringify({
      ok: true,
      scanned: requests?.length ?? 0,
      removed,
      failed
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
});
