// Persist one dispatch claim before any external request. A lost/uncertain result
// is reconciled using that claim, never by blindly dispatching the adapter again.
type Client = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
type Input = {
  userClient: Client; admin: Client; sessionId: string; provider: string;
  adapterUrl: string; adapterSecret: string; expiresAt: string;
  payload: Record<string, unknown>;
};
type Claim = { attempt_id: string; disposition: string; provider_checkout_id: string | null; checkout_url: string | null };

const pending = (code = "handoff_pending") => ({ status: 409, body: {
  error: "Checkout handoff could not be confirmed. Check your order status before trying again.", code,
} });
function secureUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export async function handoffCheckout(input: Input, send: typeof fetch = fetch) {
  const { userClient, admin, sessionId, provider, adapterUrl, adapterSecret } = input;
  let claim: Claim;
  try {
    const result = await userClient.rpc("claim_checkout_provider_handoff", {
      p_checkout_session_id: sessionId, p_provider: provider,
    });
    if (result.error || !Array.isArray(result.data) || result.data.length !== 1) return pending("handoff_unavailable");
    claim = result.data[0] as Claim;
    if (!claim.attempt_id) return pending("handoff_unavailable");
  } catch { return pending("handoff_unavailable"); }

  // A concurrent request, process loss, network uncertainty or rejected adapter
  // leaves a durable claim. It must not authorize a second external dispatch.
  if (claim.disposition === "awaiting_result") return pending();
  if (!["invoke_adapter", "finalize", "reuse"].includes(claim.disposition)) return pending("handoff_unavailable");

  if (claim.disposition === "invoke_adapter") {
    const fail = async (code: string) => {
      try {
        await admin.rpc("record_checkout_handoff_result", { p_attempt_id: claim.attempt_id, p_failure_code: code });
      } catch { /* The original claim is already durable if this write fails. */ }
      return pending(code);
    };
    if (!Number.isFinite(Date.parse(input.expiresAt)) || Date.parse(input.expiresAt) <= Date.now()) return fail("expired_before_dispatch");
    let response: Response;
    let body: Record<string, unknown>;
    try {
      response = await send(adapterUrl, {
        method: "POST", redirect: "error",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adapterSecret}`,
          "Idempotency-Key": `checkout:${sessionId}` },
        body: JSON.stringify({ ...input.payload, handoff_attempt_id: claim.attempt_id, idempotency_key: `checkout:${sessionId}` }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) return fail("adapter_rejected");
      body = await response.json();
    } catch { return fail("adapter_unavailable"); }
    const url = secureUrl(body?.checkout_url);
    const reference = typeof body?.provider_checkout_id === "string" ? body.provider_checkout_id : "";
    if (!url || !reference.trim()) return fail("adapter_response_invalid");
    try {
      const result = await admin.rpc("record_checkout_handoff_result", {
        p_attempt_id: claim.attempt_id, p_provider_checkout_id: reference, p_checkout_url: url,
      });
      if (result.error) return pending("handoff_result_pending");
    } catch { return pending("handoff_result_pending"); }
    claim.provider_checkout_id = reference;
    claim.checkout_url = url;
  }
  // A prior successfully recorded receipt survives finalization/response failure.
  // Retry uses that same receipt and never calls the external adapter again.
  const url = secureUrl(claim.checkout_url);
  if (!url || !claim.provider_checkout_id?.trim()) return pending("handoff_result_pending");
  try {
    const result = await userClient.rpc("begin_checkout_provider_handoff", {
      p_checkout_session_id: sessionId, p_provider: provider,
      p_provider_checkout_id: claim.provider_checkout_id,
    });
    if (result.error) return pending("handoff_finalization_pending");
  } catch { return pending("handoff_finalization_pending"); }
  return { status: 200, body: { ok: true, checkout_url: url, provider_checkout_id: claim.provider_checkout_id } };
}
