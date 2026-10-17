# Dependency-aware authorization and Auth hardening report

**Database hardening is deployed and verified. The full package still has two
external actions outstanding:** internal platform-owner defaults and hosted
leaked-password protection. A separate pre-existing checkout defect is verified.
This report is not launch, content, provider or browser/device acceptance.

## CURRENT HEAD

- Branch: `build/adventure-club-app`.
- Starting commit: `60e151c5556a407982342a81c8bac42579597699`.
- Tested implementation: `8ec568fe4bc3859bc003e202fe1c0a7220d40fb8`; subsequent
  completion commits preserve deployment evidence and documentation.
- New deployed migration: `20260927013941_dependency_aware_client_privileges.sql`.
  The CLI created the draft; the new file was aligned to the managed tool's
  assigned live timestamp after application. No recovered/historical file changed.
- Main remains `57b37be469569b909095172de0cd5bc392a755b8`.

## PRIVILEGE MODEL BEFORE

The complete live catalog matched the prior recovery checkpoint before changes.
Both client roles had TRUNCATE/REFERENCES/TRIGGER/MAINTAIN on 111 public tables,
broad writes on 25 views, four broadly granted identity sequences, six broad
schema defaults and seven private functions with implicit PUBLIC EXECUTE.
Isolated actual `anon` and `authenticated` TRUNCATE probes succeeded under the
legacy grants and rolled back. No destructive probe ran on production.

## DEPENDENCY MATRIX

[CLIENT_PRIVILEGE_MATRIX.md](../security/CLIENT_PRIVILEGE_MATRIX.md) and the
machine-readable `supabase/security/` evidence cover all 145 relations and 213
functions. The map includes 443 source/embedded-relation call references, dynamic
invitation/guardian decisions, invoker SQL/RLS/trigger dependencies, guarded
definer boundaries, all ten Edge functions and Storage policies. Every retained
client operation has a concrete source/reason. All function expressions parsed
without errors; row-lock column requirements were separately reviewed.

## PRIVILEGE CHANGES

| Capability | Before | Deployed |
| --- | --- | --- |
| anon table/view CRUD | Broad | None |
| authenticated public-table SELECT / INSERT / UPDATE / DELETE | 112 / 109 / 110 / 111 | 104 / 58 / 51 / 1 |
| Dangerous table rights for either client role | 111 tables each | Zero |
| authenticated view SELECT | 23 | 20; all 25 views remain invokers |
| Client writes/administrative grants on views | 25 views | Zero |
| Client sequence capabilities | Four broadly granted | Zero; identity inserts verified |
| Function EXECUTE (anon ACL / authenticated / service_role) | 8 / 161 / 104 | 0 / 147 / 9 |
| Private implicit PUBLIC functions | Seven | Zero |

The previous eight anon function ACLs included seven private functions blocked by
schema USAGE; both the ACLs and the exposed public RPC grant are now removed.
Group membership retains UPDATE only on `status, ended_at`. Variants/promo codes
retain UPDATE only on `id` for existing row-lock statements; RLS still governs
those operations. The single table DELETE is required by the existing checkout
RPC's exception cleanup; no client DELETE policy is added.

Three admin-gate helpers retain narrow authenticated execution plus their active
admin guards. Three former PUBLIC trigger entrypoints and the owner-only
challenge-access helper lose client execution. Raw XP/badge/internal helpers and
all eight private tables remain unavailable directly to clients. Service-role
EXECUTE is limited to the nine RPCs actually used by worker/Edge code; its existing
table/Storage capabilities remain unchanged.

`dc_entity_payload`, `dc_entity_fingerprint` and `household_is_paid_member` become
SECURITY INVOKER so direct clients respect content/family RLS. Nested owner calls
retain owner permissions. No new definer boundary or policy is introduced.

Postgres defaults no longer grant client table/view/sequence/function rights;
a global function default also removes implicit PUBLIC EXECUTE. The three
`supabase_admin` defaults remain unresolved and fully represented in recovery.

## AUTH HARDENING

**Leaked-password protection remains disabled.** The connector has no Auth-config
operation; the available dashboard session redirects to sign-in. No Auth setting
was changed. [Exact action and behavior](../security/AUTH_HARDENING.md): enable the
setting in this project's Email Auth settings, or use the authorized Management
API with only `password_hibp_enabled=true`, then read back and rerun advisors.

The app now gives specific, safe guidance for leaked-password rejection. Actual
isolated signup/sign-in, weak-password rejection, strong-password change/new
sign-in and recovery reset pass. Local tests do not prove hosted HIBP activation
or real email delivery. Existing successful sign-ins remain accepted.

## FILES CHANGED

- Auth feedback and its tests in `club-app`.
- One new forward migration; dependency scanner, allowlist, matrix and preserved
  legacy ACL/provenance evidence in `supabase/security` and `docs/security`.
- New actual-role privilege SQL and Auth/PostgREST HTTP suites; explicit temporary
  helper grants in four existing suites; expanded family/subscription privacy test.
- Recovery capture/query/generator/bootstrap/invariants/runner/config/provenance;
  exact new forward SQL/manifest outside the frozen 40-record historical archive.
- Existing CI workflow and current state/architecture/security/decisions/agent
  instructions, recovery runbook, historical-inventory label and this report.
- No Edge source, artwork, approved content or production deployment config changed.

## DATABASE CHANGES

Only application ACLs, postgres default ACLs and the three invoker flags above.
The migration also requests a PostgREST schema-cache refresh. Production family,
Auth, commerce and Storage rows, jobs, providers and historical records were not
written. Full live metadata equals the tested baseline. All 40 historical SQL
hashes remain identical; live history now has 41 records and root has 25 files,
with the original 12 timestamp mismatches preserved.

## SECURITY VERIFICATION

Own-family success and foreign-household/child denial pass. PIN persistence,
five-attempt cooldown, concurrency, user-bound unlocks, expiry/revocation,
parent approve/return, protected duplicate-safe Book awards and active admin-role
separation remain intact. Direct admin/entitlement writes, raw XP/badge execution,
private-table inspection, dangerous SQL capabilities and anonymous RPCs are denied.
Draft payload/fingerprint inspection obeys RLS; another family's paid status is
hidden while the caller's own status remains readable.

The advisor still reports the two known findings: disabled leaked-password
protection and the intentionally guarded authenticated revoke-session definer.
No zero-warning result is claimed.

## TESTS PERFORMED / RESULTS

- 282/282 app tests, production build and ten Edge entrypoint syntax checks pass.
- Eleven SQL suites pass: PIN 29, guardian RPC 21, Book Adventure 19, admin gate 16,
  household RLS 15, privilege 28, plus onboarding and four existing regressions.
- Six independent authenticated PIN attempts serialize, persist cooldown, issue
  zero tokens and deny the correct PIN during lockout; fixtures are cleaned.
- 51 actual local Auth/PostgREST checks pass, including every approved table/view
  read as guardian/admin, embeddings, onboarding, invitations, privacy, identity
  INSERT, PIN, admin draft/gate, reading position, activity/Book completion,
  duplicate XP denial and password/recovery flows.
- Pre-deployment full Supabase CI passed at `8ec568f`:
  [run 36286074438](https://github.com/eaglevisiondigital/dustincourageous/actions/runs/36286074438).
  Earlier full HTTP pass: [run 36285858341](https://github.com/eaglevisiondigital/dustincourageous/actions/runs/36285858341).
- Native PostgreSQL 17.11 and actual Supabase PostgreSQL 17.6 restores pass.
  The existing large JS chunk warning remains; Edge syntax is not Deno/runtime
  or provider acceptance. Older copied-helper suites retain their limitations;
  real-role and Auth-issued HTTP tests provide separate independent coverage.

## RECOVERY VERIFICATION

The baseline intentionally captures the new ACLs. Global function-default ACLs
are now explicitly captured/rendered (schema NULL) and compared, not ignored.
Unsupported other global defaults still fail recovery. Full catalog/effective-ACL
comparison passes before and after isolated tests, including after HTTP fixtures.
Supabase-admin defaults remain exact unresolved evidence. The original 40-record
archive/map and its source commit remain immutable; new live SQL is preserved
under `supabase/recovery/forward/`. Cron remains inactive in isolated restores.

## UNRESOLVED ISSUES

1. Hosted `supabase_admin` default ACLs require a supported platform action.
   Postgres is neither a member of that role nor a superuser. See the complete
   [Chat/platform handoff](../security/PLATFORM_DEFAULTS_HANDOFF.md). No role
   elevation, system-catalog workaround or support message was attempted.
2. Enable and verify leaked-password protection through an authorized signed-in
   dashboard/Management API. No purchase or unrelated Auth change is authorized.
3. Existing `create_checkout_order` fails with ambiguous `order_number`. The
   identical error was reproduced with actual authenticated roles in both the
   untouched legacy restore and hardened restore, inside rolled-back synthetic
   transactions. Its definition is unchanged. Source also contains an invoker
   `auth.users` read and writes without INSERT policies; these must be reviewed
   when Chat scopes a checkout fix. Do not claim checkout/payment acceptance.
4. Previously documented Edge, live browser/device/email/Storage/provider, backup,
   creative authority and Book 1 approval dependencies remain. This package does
   not resolve or silently approve them.

## RECOMMENDED NEXT STEP / CHAT HANDOFF

RECOMMENDED THINKING LEVEL: HIGH
CHAT DECISION NEEDED

Review this report and route the two outstanding configuration/platform actions.
The intended next phase is **Work-led real signed-in/browser/device acceptance**
for guardian Auth, onboarding, Family Hub, multiple children, PIN/approvals,
reading/privacy/membership, admin and mobile/accessibility. Carry the verified
checkout blocker into that plan; do not interpret green isolated tests as live
checkout acceptance. Chat should scope any targeted checkout/Edge fix from the
findings. No broad Edge/provider, launch or new major Codex package is started.
