# Edge Function recovery audit — 2026-09-26

All ten deployed bundles were retrieved read-only. Four previously tracked
functions match exactly; six deployed-only functions are now restored byte-for-byte
under `supabase/functions/<slug>/`. No deployed function was changed, deleted or
invoked during this audit. Per-file hashes, versions, gateway flags and required
environment names are in `supabase/recovery/edge-source-manifest.json` and
`edge-metadata.json`. No secret values were retrieved or committed.

| Deployed function | Version | Gateway JWT verification | Initial classification | Usage evidence |
| --- | --- | --- | --- | --- |
| public-site-form | 1 | false | Deployed-only, recovered | Legacy; website now names v2; external callers unknown |
| public-site-form-v2 | 1 | false | Tracked, exact | `assets/js/backend-forms.js` |
| privacy-export | 1 | true | Deployed-only, recovered | `PrivacyDataControls.tsx` invokes it |
| privacy-export-cleanup | 1 | false | Deployed-only, recovered | Daily cron; one HTTP 200 observed |
| notification-delivery-worker | 1 | false | Deployed-only, recovered | Legacy; current cron names v2; external callers unknown |
| notification-delivery-worker-v2 | 1 | false | Tracked, exact | Every-minute cron; 1,440 HTTP 200 responses observed |
| commerce-checkout | 3 | true | Tracked, exact | `storeCheckout.ts`; provider activation remains pending |
| commerce-payment-webhook | 1 | false | Deployed-only, recovered | Legacy callback; external adapter configuration unknown |
| commerce-payment-webhook-v2 | 3 | false | Tracked, exact | Current documented adapter contract; provider activation pending |
| integration-provider-test | 1 | true | Deployed-only, recovered | `IntegrationHealthAdmin.tsx` invokes it |

Invocation evidence is an aggregate of `function_edge_logs` in the default last
24-hour window at inspection on September 26. No other
function IDs appeared in that sample. Absence in a one-day window does **not** prove
an endpoint is unused, and HTTP 200 does not prove delivery/provider acceptance.
No request bodies, headers, IP addresses, tokens or family records were collected.

## Recovered endpoint reviews

### public-site-form

- **Auth/authorization:** intentionally public POST/OPTIONS endpoint; supported form
  type and guardian consent required for waitlist writes. Service client writes
  only marketing leads or contact inquiries.
- **Environment/service access:** `SUPABASE_URL`, JSON `SUPABASE_SECRET_KEYS.default`.
  No service key reaches the browser. The recovered `deno.json` is included.
- **CORS/validation:** first-party origins, localhost:5173 and broad `*.netlify.app`;
  other explicit origins rejected, requests without Origin accepted. Honeypot,
  trimmed/capped strings, email and integer age 0–18 validation. Hash-based per-IP
  count limits are separate from inserts, so concurrent submissions can race the
  limit; count-query errors do not fail closed. Forwarded-IP trust needs gateway
  validation before claiming abuse protection.
- **Secrets/errors:** secrets only from environment; invalid JSON gets 400, database
  insert errors are logged and clients get generic 500. Invalid environment JSON
  is not caught. No embedded credential found.
- **Usage/treatment:** retain exact legacy source; no invocation observed. Review
  preview-origin scope, rate limiting, consent semantics and optional child data
  collection in a separate approved hardening/policy package.

### privacy-export

- **Auth/authorization:** gateway JWT plus `auth.getUser(token)`. Reads the requested
  privacy request through the caller's RLS client; permits only household/child
  export types and rejects canceled/rejected requests. Payload assembly calls the
  guarded `privacy_export_payload` RPC as the caller.
- **Environment/service access:** URL, publishable-key JSON and secret-key JSON.
  Service client uploads JSON to private `privacy-exports`, updates the request,
  and signs a 900-second download URL; export reference expires after seven days.
- **CORS/validation:** first-party, broad Netlify preview origins and localhost;
  POST/OPTIONS, JSON body, required request ID and supported action. UUID/type
  validation is partly delegated to PostgREST. CORS is not an authorization gate.
- **Secrets/errors:** secret stays server-side. Auth denial and inaccessible record
  are handled; storage failures are generic; some RPC messages reach the client.
  Upload/update/sign operations are separate and can leave partial artifacts.
- **Usage/treatment:** current privacy UI invokes it; retained exactly. Concurrent
  cancellation, membership removal, repeated generation and cleanup races need
  targeted testing before claiming atomic revocation. This audit did not establish
  an exploitable cross-family bypass or perform live export requests.

### privacy-export-cleanup

- **Auth/authorization:** POST only; dedicated `x-cleanup-secret` validated through
  service-only `verify_privacy_cleanup_secret` before querying exports.
- **Environment/service access:** URL and secret-key JSON; reads at most 500 expired
  ready exports, removes their Storage objects, then clears export metadata and
  completes the request. Validator uses the server-held secret hash; hashes/values
  were not copied into this baseline.
- **CORS/validation:** no browser CORS contract; no arbitrary bucket/object input.
  Candidate paths come from database rows. Server-to-server scheduled endpoint.
- **Secrets/errors:** no hardcoded secret; failures log record IDs/error details
  and continue or return a generic query error. Separate delete/update operations
  require retry/race acceptance, not a claim of one atomic transaction.
- **Usage/treatment:** active daily cron and one HTTP 200 in the sampled window;
  exact source retained. New environments need a newly generated cleanup secret,
  matching private hash and Vault reference before deliberate activation.

### notification-delivery-worker

- **Auth/authorization:** POST with an `apikey` matching one of the configured
  privileged secret keys; no ordinary user token is accepted. The v2 endpoint also
  accepts a dedicated token via `validate_worker_token`; cron explicitly uses v2.
- **Environment/service access:** URL/secret-key JSON; optional email provider,
  Resend key/from address, push provider/webhook URL/secret. Claims queue entries
  through service RPCs, reads guardian preferences and Auth email, accesses active
  device tokens, sends configured adapters, and records delivery/integration health.
- **CORS/validation:** server-only, no CORS; clamps requested batch size to 1–200,
  honors quiet hours/channel settings, suppresses unconfigured providers and bounds
  retries. Adapter URLs come from environment, not request input.
- **Secrets/errors:** no embedded credentials. Push adapter secret is optional and
  HTTPS is not enforced here; provider response/error details are persisted. Exact
  source does not prove a malicious adapter cannot echo credentials into logs.
- **Usage/treatment:** no sampled legacy invocation; preserve source and inspect
  external scheduling before retiring it. Shared privileged-key compatibility,
  adapter transport/secret requirements and response redaction belong in a
  reviewed integration hardening package. The recovered `deno.json` is included.

### commerce-payment-webhook

- **Auth/authorization:** POST plus dedicated `x-dc-commerce-secret` matching
  `DC_COMMERCE_WEBHOOK_SECRET`; gateway verification intentionally disabled.
- **Environment/service access:** URL/secret-key JSON and callback secret. Uses the
  service client for webhook event records, payment RPC and provider health.
- **CORS/validation:** server-only; nonempty provider/event/order/payment fields.
  Older Edge code lacks v2's amount/currency/checkout/replay validation. However,
  the **current database RPC** still locks checkout/order and requires the payload
  to match provider checkout ID, total, currency, state and expiry. Historical Edge
  source does not restore the old database implementation.
- **Secrets/errors:** no hardcoded secret; invalid/absent configured secret fails
  closed. RPC failures return 409 and their database message. Non-paid callbacks
  can consume event identifiers, unlike v2's current reconciliation behavior.
- **Usage/treatment:** no sampled invocation and external callback setup unknown.
  Preserve exact source, retain the v2 contract as current, and validate/retire the
  legacy path only through a separate reviewed provider migration.

### integration-provider-test

- **Auth/authorization:** POST plus Bearer token verified by Auth. Caller-client
  query of active `app_admins` must return `super_admin` or `operations_admin`
  before any service operation. Editable metadata cannot grant this role.
- **Environment/service access:** URL, both key JSON objects, email/Resend settings,
  push webhook settings and commerce provider/adapter settings. Service client
  creates test-run records, updates provider health and counts active installations.
- **CORS/validation:** four allowlisted provider keys; **no OPTIONS/CORS handling**,
  so actual browser invocation requires Work validation. Email uses a read-only
  credential endpoint. Push/commerce request explicit dry-run flags and require
  `ok=true,test_mode=true` responses.
- **Secrets/errors:** environment-only credentials; URLs cannot be supplied by the
  request, but HTTPS and adapter-secret presence are not required here. Some raw
  provider/exception messages are stored. Missing provider settings are reported.
- **Usage/treatment:** used by current integrations UI; preserved exactly. A dry-run
  response cannot prove an external adapter caused no side effect; its contract
  must be independently verified before activation. Review CORS, HTTPS/secret
  requirements, timeouts and response redaction in the next integration package.

## Shared deployment dependencies and security disposition

All recovered sources import Supabase JS `2.117.1`; the two recovered import maps
are preserved. The v2 payment function's tracked `validation.ts` is included and
exact. Runtime declaration imports use `jsr:@supabase/functions-js/edge-runtime.d.ts`;
the deployment service/runtime is a managed dependency, not an archived container.

`deployed-settings.toml` records gateway settings for all ten functions. It is an
inert configuration fragment: no automatic deploy occurs. A future recovery must
merge reviewed settings into the **new destination** project's configuration,
generate fresh secrets, validate adapters, and deploy only with separate approval.
The local recovery CI does not need Edge/provider secrets or a hosted project ID.

This source review found legacy hardening and acceptance issues, but did not
confirm a newly exploitable unauthenticated authorization bypass that warranted
changing deployed behavior in this recovery package. No provider was activated,
no credential was weakened, and no privileged helper was opened to simplify tests.
Leaked-password protection remains disabled and unresolved; Auth was not changed.
