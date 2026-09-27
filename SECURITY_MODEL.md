# Security model and verified repair

Updated September 26, 2026. This is bounded implementation evidence, not launch certification.
See [repair evidence](docs/audits/2026-09-26-security-repair.md) and the historical [baseline](docs/audits/2026-09-26-baseline.md).

## Established controls

- Public tables: 112/112 with RLS; 298 policies. Views: 25/25 security_invoker.
- Active household membership gates family/child reads; owner/parent/guardian roles gate child management.
- Private tables have no anon/authenticated table grants. Authenticated has private-schema USAGE for authorized helpers; anon does not.
- Admin roles come from active app_admins records, not editable metadata. Self-admin and self-entitlement writes remain prohibited.
- The browser uses a publishable key and Auth session. The baseline tracked-file scan found no secret/service-role token; this is not a full Git-history/runtime-secret audit.
- Digital reader ownership, release approval and child-household entitlements protect manifests/private images.
- Service adapters validate users or dedicated worker/webhook secrets before privileged operations.

## S1: PIN rollback defect — repaired

Previously, the verifier updated failed_attempts/locked_until and the outer unlock function raised on failure, rolling those updates back. The baseline diagnostic observed six wrong attempts leaving zero attempts and no cooldown. The new real-role regression independently reproduced the exception before repair.

The unlock RPC now returns NULL for verification failure. This is a successful database transaction carrying an application denial: no token means no authorization. Both existing UI callers already reject missing data; the RPC TypeScript return type is now string | null. Do not reintroduce an exception around this normal denial.

The verifier retains SELECT FOR UPDATE on the household's private PIN row. It evaluates wall-clock time after acquiring that lock, increments failures serially, and at five failures resets the counter to zero while persisting a 15-minute locked_until. Further attempts, including the correct PIN, remain denied during cooldown. Correct PIN after expiry resets state and issues the existing 30-minute user/household-bound token.

A real six-session test observed six requests blocked on this mutex. Six test executions succeeded, all returned denial, the cooldown persisted, no sessions were issued and the correct PIN remained denied during lockout.

## S2: RPC/helper boundaries — repaired

| Path | Authorized boundary | Why client privilege stays limited |
| --- | --- | --- |
| Guardian approve/return | Public invoker RPCs; authenticated EXECUTE on private.guardian_unlock_session_valid | Helper checks Auth user, managed household, token hash, expiry and revocation; only touches last_used_at on the matching session |
| Guardian revocation | Existing public.revoke_guardian_unlock_sessions becomes a guarded SECURITY DEFINER | Checks can_manage_household and only updates sessions with user_id=auth.uid() in that household |
| Book Adventure completion | Public invoker/RLS mutation plus private.award_completed_book_adventure | Wrapper checks Auth, child management, target-household access, persisted completion, book visibility and authoritative required steps; XP amount/source are server-selected |
| Admin production gate | Public invoker plus authenticated EXECUTE on existing private.admin_get_production_launch_gate_impl | No arguments; existing private.is_app_admin checks active server-side app_admins before returning gate data |

All changed/new definer bodies use an empty search_path and qualified objects. Anonymous EXECUTE is denied on these entry points. No private table access was granted. Raw award_xp_event/evaluate_child_badges remain uncallable by authenticated clients.

The session validator now checks and touches its row in one UPDATE. Expiry uses wall-clock time, and concurrent row changes are rechecked after lock acquisition. Revocation's missing private-table privilege was reproduced by the required revoked-token regression; the narrow fix was included to preserve that requested behavior.

The Book wrapper locks completed progress before credit and rechecks authoritative required steps. An incomplete linked requirement hidden by catalog RLS cannot become an award shortcut. The existing XP unique source-event index, badge child/badge uniqueness and reward child/reward uniqueness preserve repeat-credit protection. Synthetic completion produced exactly seven configured XP, one configured badge and one configured reward across repeated calls.

## Test boundaries and cleanup

The four new SQL suites use actual deployed functions, tables, triggers, authenticated/anon roles and Auth claims set only by the test administrator. They do not replace authorization helpers or policies. Synthetic book/challenge publication visibility is set only inside a rolled-back fixture transaction, temporarily disabling triggers for those setup UPDATEs; triggers are restored before any tested operation. No real content or governance approval is changed.

PIN expiry is simulated by expiring only the synthetic timestamp, rather than waiting 15/30 minutes. The concurrency harness briefly commits a synthetic household to make it visible to independent connections. The connector-compatible driver uses six temporary pg_cron jobs on the existing extension; each switches to authenticated for the tested RPC. Its controller unregisters the batch after completion. All fixture rows, jobs and test run records were removed and verified absent, including after the app restart.

85 new checks, the six-session concurrency test and six existing SQL suites passed. The household RLS suite retains its 13 passing checks. The older guardian/reader/privacy/subgate suites retain their documented copied-helper/mock boundaries; their results are supplemented by the new actual-role tests.

## Advisor findings

- Existing warning: [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Auth configuration was not changed.
- New, reviewed warning: [authenticated SECURITY DEFINER execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) on public.revoke_guardian_unlock_sessions. This exposure is intentional: the RPC must revoke a caller's protected sessions and has explicit guardian/household/user checks. The tests deny anonymous, foreign-household and non-guardian use and verify another guardian cannot revoke the issuing user's session. Do not claim a zero-warning advisor result.

## Isolated recovery security evidence

The subsequent authorized recovery package preserves current function bodies,
RLS, owners and effective ACLs in a separate bootstrap. Native isolated restoration
passes the full catalog comparison, four current actual-role suites (85 checks),
household RLS (13 checks), onboarding and four older regression suites, plus real
concurrent PIN attempts. Production receives no writes or test fixtures in this
package. Supabase-platform CI status is recorded in CURRENT_BUILD_STATE.md.

The local Supabase runner uses the existing container-only `supabase_admin` role
to restore owner default privileges; it does not grant additional privileges to
client roles. Tests switch to authenticated/anon and check that those roles cannot
bypass RLS. All cron definitions are inactive; there are no Vault secret values or
outbound provider calls. Native PostgreSQL uses explicitly documented platform
adapters, not substitutes for the application authorization functions.

All ten Edge sources now match captured deployed files. Review found legacy CORS,
adapter transport/secret, rate-limit, privacy-race and error-handling concerns;
no deployed behavior was changed. See [the Edge audit](docs/recovery/EDGE_FUNCTION_AUDIT.md).

## Current least-privilege policy

The subsequent approved hardening migration `20260927013941` is deployed and its
full metadata matches the tested baseline. Ordinary clients lack all application
TRUNCATE/REFERENCES/TRIGGER/MAINTAIN, view writes and sequence rights. Anonymous
application data/RPC grants are removed; public-site Edge forms retain service
access. Authenticated CRUD is an explicit dependency allowlist, not a consequence
of having RLS. All seven implicit PUBLIC private-function grants are removed.

Content payload/fingerprint and household paid-status helpers now use caller RLS;
existing owner-internal calls retain owner access. Raw awards/private tables remain
protected. No new definer, policy, admin role, entitlement rule or child identity
model was added. The full matrix includes invoker dependencies, role/policy checks,
PostgREST embeddings and row-lock column grants. See
[CLIENT_PRIVILEGE_MATRIX.md](docs/security/CLIENT_PRIVILEGE_MATRIX.md).

Postgres defaults now require explicit client exposure, including global PUBLIC
function EXECUTE revocation. Three platform-owned supabase_admin defaults remain
unresolved because the hosted connection cannot administer that role; they are
still compared exactly by recovery. Do not hide this limitation or elevate a role.

28 privilege checks, 15 household checks, the retained 85 repair checks, remaining
SQL suites, concurrency and 51 real Auth/PostgREST checks pass. The older internal
digital-entitlement predicate test now uses an explicitly labeled temporary owner
wrapper; it does not restore a production client helper grant. Real HTTP digital
reader tests independently verify actual client access. No production data test,
provider activation, secret extraction or customer-data capture occurred.

Leaked-password protection is still disabled; Auth UI/configuration access is the
remaining action described in [AUTH_HARDENING.md](docs/security/AUTH_HARDENING.md).
Existing checkout is fail-closed on ambiguous order_number, reproduced under both
old/new ACLs; it is not accepted for payments. Existing Edge/provider/content/
backup/real-device concerns retain their prior scope. See the
[complete hardening report](docs/audits/2026-09-26-privilege-hardening.md).
