# Bounded provider-handoff authorization and lifecycle repair

## CURRENT HEAD

- Start: `29b3d29111704dabb2d9f3082da119444f985577`, `build/adventure-club-app`.
- Candidate migration: `20260927024333_secure_checkout_provider_handoff.sql`.
- Status: native/Edge/application checks passed; Supabase HTTP CI and deployment pending.
- Main remains outside this package; no provider activation or real charge.

## DEFECT REPRODUCED

`Checkout session is unavailable or expired` on a fresh checkout created by its
real authenticated guardian. The original deployed function and full live catalog
match the starting checkpoint. The archived
[before-repair probe](fixtures/provider-handoff-before-repair.sql) also proves
foreign and anonymous callers are denied; all fixtures roll back.

## ROOT CAUSE

The invoker SELECT FOR UPDATE requires an applicable UPDATE policy. Guardians
have none for checkout_sessions, so RLS filters the owned row. General UPDATE
would expose much more than handoff. The Edge function also previously called the
adapter before attempting that invalid transition; repeated requests could create
multiple provider sessions before any durable local handoff record existed.

## REPAIR

The existing begin_checkout_provider_handoff signature/void result and invoker ACL
remain. A private guarded finalizer validates the caller, active guardian membership,
checkout owner, order purchaser/household relationship, state, expiry and the exact
trusted provider receipt. One durable private attempt per checkout precedes every
adapter request. Only the service-role receipt API can attest to provider output;
guardians cannot invent references or directly update session/order fields.

## HANDOFF STATE MACHINE

1. Existing Edge authentication, owned-session read, priced-line read and provider
   configuration checks. An unconfigured provider exits before claiming anything.
2. Authenticated claim locks checkout then order, validates current state/guardian
   and commits one private attempt (`claimed`). Public state stays created/draft.
3. Only the new-claim response authorizes one adapter POST. It includes the existing
   checkout ID plus a durable attempt ID and stable `checkout:<session-id>` key.
4. A server-only RPC records the validated reference/HTTPS URL (`result_ready`).
5. Guardian finalization locks checkout, order, attempt and atomically stores
   provider_pending/pending_payment plus that exact reference (`finalized`).
6. Only after finalization does Edge return the hosted URL to the browser.

No new public checkout/order states, paid transition, pricing rule or entitlement
rule is introduced. Attempts with unknown/rejected/malformed results become
`needs_reconciliation`; if that diagnostic write fails, the original claim remains.

## RETRY / CONCURRENCY MODEL

A unique checkout_session_id plus the checkout row mutex permits only one claim
response with `invoke_adapter`. Competing/repeated requests get awaiting_result,
finalize from the recorded receipt, or reuse the finalized reference. Exact repeat
finalization is idempotent while the checkout is still current and unpaid.
Conflicting references/providers, invalid states and paid checkouts are rejected.

Lock order: checkout -> order -> attempt. This matches the existing callback and
expiry checkout/order order. Receipt recording locks only the attempt and never
requests checkout/order locks, avoiding an inverse lock dependency. Expiry uses
clock_timestamp after acquiring locks; a real blocked-before-expiry request proves
that stale transaction start time cannot authorize handoff.

There is intentionally **no automatic redispatch after uncertainty**, even after
a timeout, rejected response, worker loss before dispatch, or receipt-write failure.
A durable claim is not a claim of external success. The adapter must retain the
provided checkout/attempt correlation identifiers for reconciliation; stable
idempotency metadata is sent but its external enforcement is not assumed.

## AUTHORIZATION MODEL

Both guardian helpers independently use auth.uid() and active owner/parent/guardian
membership, and require that session user and order purchaser are that UID and
households match. They have fixed empty search_path and qualified objects.
The receipt helper independently requires the trusted service JWT role; neither
anon nor authenticated has EXECUTE on its wrapper or private implementation.
The public wrapper remains invoker and the definer implementation remains private.

All existing table/column/sequence/default ACLs and RLS policies remain unchanged.
New EXECUTE: authenticated claim wrapper/helper and private finalizer; service
receipt wrapper/helper. Service gets private-schema USAGE solely to resolve its
new helper: no existing private table/function access accompanies it. The new
private attempt table has RLS and no direct client/service table grants.

## EDGE CHANGES

commerce-checkout index delegates the lifecycle to handoff.ts while preserving
Auth/CORS/provider configuration and server-priced payload handling. Repeated
provider_pending sessions can reuse the durable receipt. The adapter call has a
20-second timeout and rejects redirects. Raw adapter bodies, URLs, credentials
and network/database error text are excluded from telemetry/client errors.
Telemetry failure cannot undo a completed handoff or cause a new external request.
JWT verification remains enabled. No other Edge function is changed.

## FILES CHANGED

New forward migration; commerce-checkout index/handoff module; two Edge/application
harness suites; actual-role, independent-connection and Auth/PostgREST regressions;
recovery catalog/bootstrap/runner and provenance; dependency graph/matrix; current
architecture/security/build/handoff records and this report.

## DATABASE CHANGES

One private RLS-enabled attempt table, five new functions and the existing public
handoff definition replaced. No existing price, stock, creation, callback, policy,
trigger, default privilege, provider configuration or family row is modified.
All 40 original historical records and two prior forward migrations stay immutable.

## TESTS PERFORMED

- 50 actual-role handoff checks, including owned success, same-household wrong
  creator, foreign/anonymous, removed/non-guardian, expired/canceled/paid/mismatched
  states, immutable receipts, rollback, direct-write denial and callback replay.
- Three independent-connection cases: one dispatch claim, one finalization timestamp,
  and expiry after waiting for the order lock.
- 14 controlled Edge/module tests: actual handler wiring/order, provider-disabled
  and foreign denial, duplicate/concurrent calls, failures, retry and secret handling.
- 296 app tests, production build, all ten Edge entrypoint syntax checks plus module.
- Fresh native recovery, all 14 SQL suites and PIN/checkout/handoff concurrency.
- Actual Supabase Auth/PostgREST and full recovery CI: pending.

## RESULTS

Native isolated tests pass. No external provider or production test fixture is
used. Hosted deployment and final CI evidence will be recorded after verification.

## SECURITY VERIFICATION

Exact metadata scope checks preserve every existing ACL/policy/default and all
existing function definitions except the intended public handoff wrapper.
Existing raw payment/XP/badge/admin/entitlement protections and pricing remain.
Private receipt values cannot be set by a guardian; a failed finalizer preserves
its trusted receipt but cannot partially update the order/session.

Hosted leaked-password protection is **enabled**, attributed to September 26,
2026 Work verification supplied by PRIMARY CHAT; its advisor warning cleared.
This package does not alter Auth configuration. Supabase Support's platform-owner
default-ACL question remains pending and does not block this work or Work acceptance.

## CALLBACK COMPATIBILITY

The unchanged ten-check payment-lock suite passes. A real new claim/receipt/finalize
sequence feeds the existing service-only callback successfully; its replay creates
one processed event. Existing expired/canceled/early/mismatched callback denials
are retained. No guardian gains paid-state authority.

## RECOVERY VERIFICATION

Fresh native restoration includes 121 tables (112 public, nine private), 25 views,
219 functions and unchanged 298 public policies. Full metadata/ACL comparison runs
before and after tests. Historical archives remain separate from the current-state
bootstrap. Supabase CI and final live capture are pending.

## RECONCILIATION AND ROLLBACK

A privileged database operator can inspect the private attempt ID, checkout ID,
provider, state, failure_code and timestamps. Do not export/log checkout URLs or
credentials. Correlate the durable attempt/checkout key with the controlled adapter's
record; do not repeat the create-provider request to discover its outcome.
If a successful response is recovered, the authorized server records that **same**
reference/URL with record_checkout_handoff_result. The guardian retry then finalizes
without another adapter call, provided membership/state/expiry are still valid.
This recovery path is covered by actual Auth/PostgREST tests.

Expired/canceled checkouts cannot be revived by recording a late receipt. The
existing expiry job cancels/releases the local checkout while the private attempt
retains correlation for provider-side reconciliation. If no external result can
be established, leave the attempt blocked and resolve it operationally with the
adapter before any replacement payment attempt. No new operator UI/reset API or
automatic cancellation/refund policy is invented.

Rollback must be a reviewed forward change and preserve attempt/receipt evidence.
Do not restore the old adapter-before-claim Edge flow or delete claims to retry.
Deploy database support before the new Edge version; an interrupted rollout leaves
old finalization fail-closed. Provider activation remains prohibited during rollout.

## UNRESOLVED COMMERCE ITEMS

Provider selection/configuration, controlled sandbox contract acceptance (including
correlation lookup, idempotency, early callbacks, late outcomes and reconciliation),
fulfillment and real provider lifecycle acceptance remain future authorized work.
No provider is enabled by this package. Unknown outcomes intentionally require
operator reconciliation rather than speculative re-dispatch.

## RECOMMENDED NEXT STEP

RECOMMENDED THINKING LEVEL: HIGH

CHAT DECISION NEEDED

Return to PRIMARY CHAT to authorize Work-led real signed-in/browser/device
acceptance, including checkout only through the safe unconfigured-provider boundary.
Do not wait on the separate Supabase Support default-ACL question. Do not activate
providers or begin live payment testing automatically.
