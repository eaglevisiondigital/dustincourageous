# Targeted checkout creation repair

## CURRENT HEAD

- Starting development commit: `bbd0b138f5f57bd9305f8b01579f762e0ba34b90`.
- Branch: `build/adventure-club-app`; main is not changed.
- Candidate migration: `20260927020843_secure_checkout_order_creation.sql`.
- Status: isolated SQL verification passed; full Supabase HTTP/CI and deployment pending.

## DEFECT REPRODUCED

Actual `authenticated` execution in the untouched current restore raised
`column reference "order_number" is ambiguous`. Qualifying only that column
then raised `permission denied for table users`. A rolled-back, isolated-only
diagnostic temporarily allowing the Auth lookup exposed
`new row violates row-level security policy for table "orders"`.
No diagnostic grant or fixture was applied to production.

## ROOT CAUSE

The RETURNS TABLE output `order_number` conflicted with the INSERT RETURNING
column. The invoker implementation also required an Auth-owned email lookup and
writes to orders, items, sessions and reservations for which ordinary guardians
have no INSERT policies. Catalog row locks and promo lookup likewise require
trusted execution; reservation counts must include other households without
disclosing their records.

Once those boundaries were repaired locally, a two-connection test reproduced
another defect in the same function: compatible FOR SHARE locks allowed two
guardians to reserve the same last unit (two orders/two reservations, stock one).

## REPAIR

The public RPC keeps its signature, result shape, existing EXECUTE ACL and
SECURITY INVOKER status. It delegates the single checkout operation to
`private.create_checkout_order_impl`, a guarded postgres-owned definer with an
empty search_path. Qualified `created_order.id`/`created_order.order_number`
remove the ambiguity. SQL NULL carts now fail the existing nonempty-array rule.
An absent Auth row fails before session creation.

Product/variant reads now acquire FOR UPDATE locks before inventory calculation;
the second concurrent request waits and rechecks committed reservations. Promo
FOR UPDATE, all pricing/quantity/promo formulas, USD output, 30-minute expiry,
draft/created states and transactional cleanup remain. This does not introduce
an idempotency key or new pricing/business policy.

## AUTHORIZATION MODEL

- Identity comes only from `auth.uid()`. Active owner/parent/guardian membership
  in the requested household is required inside the trusted helper, including
  when that helper is called directly through SQL.
- The helper reads only that UID's Auth email to preserve billing-email behavior.
  No client receives SELECT on `auth.users` or another user's Auth information.
- The server selects active products, matching active variants, household-specific
  membership pricing, inventory and currently valid promos. Client totals,
  prices, identity, paid status and currency are never authoritative inputs.
- Only the complete guarded draft-order operation uses owner write authority.
  Every existing table/column/sequence/function/default ACL and RLS policy stays
  unchanged. The sole new grant is authenticated EXECUTE on this guarded private
  helper; PUBLIC, anon and service_role have no grant on it.
- Creating even a zero-total checkout does not mark it paid or create entitlement.
  Direct paid mutations and entitlement grants remain denied. The service-only
  payment callback and its checkout/order lock ordering are unchanged.

## FILES CHANGED

New forward migration; recovery catalog/bootstrap/runner; checkout SQL,
concurrency and HTTP regressions; the retained payment-lock suite's explicit
temporary-helper EXECUTE grants; dependency graph; current build/security/
architecture/decision records and this report. Application UI and Edge sources
are unchanged.

## DATABASE CHANGES

One replaced public function definition and one new private implementation;
no changed tables, RLS policies, triggers, defaults, existing grants, prices,
provider configuration, production rows or historical SQL.

## TESTS PERFORMED

- 42 actual-role checkout checks: identity/household/guardian, line snapshots,
  price spoofing, variant identity/availability, cart/quantity caps, promo rules,
  member/expired-member pricing, rollback, direct payment/entitlement denial,
  cross-household reads, repeated requests and abandoned checkout expiry.
- Independent product and variant concurrency tests: second guardian waits,
  receives insufficient inventory and leaves no partial order; fixtures removed.
- Retained payment-lock regression: ten checks, including valid synthetic
  callback/replay and expired/canceled/mismatched callback denial.
- All existing SQL security suites and concurrent PIN attempts retained.
- Full local Auth/PostgREST, application, build, Edge syntax and CI: pending.

## RESULTS

Native isolated checkout and payment-lock tests pass. Remaining verification and
deployment are tracked above; no payment provider or real transaction was used.

## SECURITY VERIFICATION

Exact before/after catalog comparison confirms that all pre-existing permissions,
policies and application definitions outside the public checkout function remain
unchanged. Raw awards, private tables, admin membership and entitlement writes
retain their earlier protection. The new operation checks Auth and guardian
authorization before its first protected lookup/write.

## RECOVERY VERIFICATION

Current bootstrap contains 214 functions. Historical archive/history mapping and
the earlier ACL forward migration remain unchanged. Fresh restore and Supabase
CI results will be recorded after completion; this package does not repair or
replay historical migration chronology.

## UNRESOLVED COMMERCE ITEMS

1. **Separate provider-handoff authorization defect:** after successfully creating
   an order as a real guardian, the existing `begin_checkout_provider_handoff`
   returns `Checkout session is unavailable or expired` for a fresh owned session.
   Its invoker SELECT FOR UPDATE is filtered by the absence of a checkout_sessions
   UPDATE policy. The Edge function invokes this RPC after its adapter request.
   It is not safe to enable a provider before this separate boundary is repaired
   and tested. This assignment explicitly limits authorization corrections to
   checkout creation; no handoff grants/policies/implementation were changed.
2. Provider configuration/selection approval and sandbox lifecycle acceptance,
   including callback/cancel/expiry, fulfillment and reconciliation, remain later
   work. The store's provider-readiness guard remains unchanged and unavailable.
3. Repeated API requests intentionally remain separate drafts; the existing UI
   blocks concurrent clicks and uncertain retries. There is no server request-key
   deduplication. Promo redemption is counted at payment, not reserved by draft
   checkout; creation validates the currently recorded limit only. Multi-product
   carts retain caller line ordering, so a deadlock victim can require a safe retry.
   Broader provider lifecycle/load acceptance remains necessary.

Unrelated existing platform-default and leaked-password-protection actions remain
documented in `docs/security/`; this repair does not claim to complete them.

## RECOMMENDED NEXT STEP

RECOMMENDED THINKING LEVEL: HIGH

CHAT DECISION NEEDED

Review the completed creation repair and scope a separate guarded provider-handoff
authorization package before any provider activation. Keep provider work and live
payments disabled. Do not automatically start the next commerce package.
