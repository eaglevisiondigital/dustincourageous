# Dustin Courageous — focused security repair

September 26, 2026. Completion report for the PRIMARY CHAT.
Scope authorized by the guardian PIN/RPC security assignment; no next build package started.

### CURRENT HEAD

- Branch: build/adventure-club-app.
- Starting commit: 786a89a657a1498fed4027144ba969e131858c9f.
- Ending implementation commit: [baa054dd8073e13f1c3feab5fdb7d9ab3f35a2e7](https://github.com/eaglevisiondigital/dustincourageous/commit/baa054dd8073e13f1c3feab5fdb7d9ab3f35a2e7). The documentation commit containing this report follows that tested code.
- Migration created/applied: [20260926212852_guardian_pin_and_rpc_security_repair.sql](../../supabase/migrations/20260926212852_guardian_pin_and_rpc_security_repair.sql).
- Dedicated Supabase project: Dustin Courageous Adventure Club / vrixketvinzhsfwwcqiu.
- Main was not modified or merged. No production site promotion or Edge deployment was performed.

### DEFECTS REPRODUCED

| Path before repair | Actual-role reproduction |
| --- | --- |
| Wrong guardian PIN | Normal unlock RPC raised “Guardian PIN was not accepted”; its exception rolled back verifier updates. The baseline diagnostic had measured six wrong calls leaving failed_attempts=0 and no lockout. |
| Guardian return | Valid own-household token/target reached permission denied for guardian_unlock_session_valid. |
| Guardian approval | Valid own-household token/target reached the same helper permission denial. |
| Book Adventure completion | A ready synthetic book with positive completion XP reached permission denied for award_xp_event. A separate zero-XP fixture reached permission denied for evaluate_child_badges. |
| Admin production gate | An active server-side admin calling the public gate received permission denied for admin_get_production_launch_gate_impl. |
| Guardian revocation | The required revoked-token regression exposed permission denied on private.guardian_unlock_sessions in the existing revoke RPC. |

The new tests were first run against the original definitions, then against the proposed changes in rolled-back rehearsals, and finally against the committed live migration.

### SECURITY REPAIRS

PIN verification failure now returns NULL from the unlock RPC. This commits failed-attempt/cooldown state and returns no token. The existing UI already treats missing data as denial; the TypeScript RPC type now records string | null.

The existing household PIN row lock serializes attempts. Wall-clock time is evaluated after obtaining that lock; the fifth failed attempt persists the existing 15-minute cooldown. A correct PIN cannot bypass active cooldown. Successful authentication after expiry resets the counter and preserves the existing 30-minute token behavior.

Guardian approve/return remain public SECURITY INVOKER functions. Their guarded private token validator receives authenticated EXECUTE. Validation and last_used_at update happen in one statement, checking household, Auth user, token hash, expiry and revocation.

Book completion remains public SECURITY INVOKER and retains RLS. Its access check now explicitly uses the target child's household. A new narrow private definer, award_completed_book_adventure, checks trusted Auth identity, guardian management, child-household entitlement, persisted completed progress, book availability and authoritative required steps. It chooses XP and source identifiers from server data, then invokes the existing XP/badge engines.

The admin gate remains public SECURITY INVOKER. Its existing no-argument private base helper receives authenticated EXECUTE and keeps its server-side is_app_admin guard. All five gate components are returned; existing blockers remain failed.

The revoke-session RPC becomes a narrowly guarded SECURITY DEFINER because its private-table update was otherwise unreachable. It can revoke only the authenticated guardian's own sessions in a household they manage. Another guardian in the same home cannot revoke the issuing guardian's session.

### FILES CHANGED

Implementation:

- club-app/src/types/database.ts.
- supabase/migrations/20260926212852_guardian_pin_and_rpc_security_repair.sql.

New regression coverage:

- supabase/tests/guardian_pin_security_regression.sql.
- supabase/tests/guardian_rpc_security_regression.sql.
- supabase/tests/book_adventure_security_regression.sql.
- supabase/tests/admin_launch_security_regression.sql.
- supabase/tests/guardian_pin_concurrency.py.
- supabase/tests/guardian_pin_concurrency_cron.py.
- supabase/tests/SECURITY_REGRESSIONS.md.

Continuity:

- CURRENT_BUILD_STATE.md, SECURITY_MODEL.md, ARCHITECTURE.md, DECISIONS.md and AGENTS.md.
- Current-status notices in BUILD_HANDOFF.md, LAUNCH_MILESTONES.md, DIGITAL_BOOK_READER.md and ALPHA_VERIFICATION.md.
- This report and follow-up pointers in the historical baseline/inventory.

### DATABASE CHANGES

One additive forward migration:

- Replaced private.verify_guardian_pin_impl, private.create_guardian_unlock_session_impl and private.guardian_unlock_session_valid.
- Added private.award_completed_book_adventure.
- Replaced public.complete_child_book_adventure and public.revoke_guardian_unlock_sessions.
- Granted authenticated EXECUTE only to private.guardian_unlock_session_valid, private.award_completed_book_adventure and the existing private.admin_get_production_launch_gate_impl.
- Explicitly denied PUBLIC/anon access on those helpers and the revoke RPC. Raw XP/badge grants were not broadened.
- No table, RLS policy, view, entitlement, provider, content approval or historical migration was changed.

Before application, all 212 live public/private function definitions/ACLs matched the captured baseline. Post-migration inventory: 213 functions, 112 public tables with RLS, 298 public policies, eight private tables with zero client table grants and 25 invoker views.

Migration totals are now 40 live entries / 24 repository files. The new filename matches its live timestamp; the original 16 missing names and 12 timestamp mismatches remain unchanged.

### AUTHORIZATION MODEL

Identity comes from trusted Auth context, never a caller-supplied guardian/admin parameter. Existing household/child management and selected-household entitlement helpers remain authoritative. Admin status comes from active app_admins records; editable metadata and ordinary client mutation cannot establish it.

Ordinary clients still cannot execute raw award_xp_event or evaluate_child_badges, select private session tables, choose arbitrary award values or use the new wrapper for another household. Every modified/new definer uses a fixed empty search_path with qualified objects.

The two grant-based repairs expose helpers that already perform their own complete authorization. The Book wrapper exposes only a validated completion action, with existing unique constraints protecting XP, badge and reward idempotency.

### TESTS PERFORMED

- PIN actual-role regression: 29 checks.
- Guardian approve/return actual-role regression: 21 checks.
- Book Adventure actual-role regression: 19 checks, including real XP/badge/reward effects and repeat calls.
- Admin full launch-gate actual-role regression: 16 checks, including all five established admin roles, suspended/ordinary/anonymous denial and metadata/client-promotion denial.
- Actual concurrent PIN requests: six independent database sessions observed waiting on the same row lock, followed by six successful denial-test executions.
- Existing deployed household RLS suite: 13 checks.
- Existing onboarding, guardian decision, digital reader, reading privacy and digital launch-gate suites.
- npm test, npm run build and CI-equivalent Edge syntax check.
- [GitHub CI at baa054d](https://github.com/eaglevisiondigital/dustincourageous/actions/runs/36275730607): success.
- Live ACL/RLS inventory, security advisors and synthetic-fixture/job cleanup checks.

### RESULTS

85 new SQL checks passed; all six existing SQL suites passed. Application tests: 280 passed, zero failed/skipped. Production build and Edge syntax validation passed. GitHub CI passed. Existing main bundle warning remains 522.38 kB.

Concurrency evidence: blocked_observed=6, runs=6, succeeded=6, failed=0, remaining_jobs=0. After six wrong attempts: failed_attempts=0 because the threshold resets it, active 15-minute cooldown, zero sessions. Correct PIN during that cooldown was denied and state remained locked.

All synthetic household/auth/profile/membership/subscription/preference/PIN/session/notification/audit records created by the concurrency fixture were verified removed; test jobs and run records were zero. The rollback-only catalog fixtures were absent. An app restart interrupted an in-flight test runner, but saved files and the applied migration survived; unfinished reader/privacy checks were resumed and cleanup was reverified.

### SECURITY VERIFICATION

- Household isolation: own-family success, foreign-family and dual-household entitlement denial; existing 13-check RLS suite remains green.
- Guardian authorization: missing, invalid, expired, revoked, wrong-user and wrong-household tokens are denied; non-guardians and anonymous callers remain denied.
- PIN protection: persistent accounting, five-attempt cooldown, expiry/reset behavior, no token on denial and actual concurrent contention verified.
- Child privacy: private table grants and reader/privacy controls remain unchanged.
- Admin separation: complete gate retrieval for active established roles; metadata promotion, direct self-admin INSERT, suspended users and ordinary guardians denied.
- XP/badges: raw functions remain inaccessible. Ready own-household completion awarded exactly seven configured XP, one configured badge and one configured reward despite repeat calls; incomplete requirements/direct-wrapper misuse were denied.
- No payment/email/push/GoodBarber activation, content approval, production promotion or main merge.

### UNRESOLVED ISSUES

- Migration/Edge recovery remains incomplete: 16 missing migration names, 12 old timestamp mismatches and six missing deployed Edge source directories. Isolated SQL CI/restoration is not yet established.
- Supabase Auth [leaked-password protection remains disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- The advisor additionally flags [authenticated definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) on the intentionally guarded revoke-session RPC. Its access is required and scoped as documented above; this is a reviewed warning, not a zero-warning report.
- Broad legacy grants, full Bible/Production Manual files, final Book 1 assets/approval, provider readiness and signed-in/browser/device/Storage HTTP acceptance remain separate work.
- SQL tests use database roles and synthetic Auth claims set by the administrator. They do not prove real Auth login or HTTP behavior. Synthetic published catalog visibility is confined to rolled-back setup; no authorization helper or RLS policy is mocked in the new suites. Older copied-helper tests retain their original boundaries.
- The SQL connector serialized external concurrency calls; the live proof therefore used the existing pg_cron extension to create independent authenticated sessions. Temporary jobs were removed. No recurring operational automation remains.
- The exact cause of the app's missing approval control was not established.

### RECOMMENDED NEXT PACKAGE

RECOMMENDED THINKING LEVEL: HIGH

CHAT DECISION NEEDED

Approve the next separate package: **database/deployment recovery and reproducibility**. Map the 16 missing migration records and 12 timestamp differences, recover the six missing deployed Edge sources, and establish an isolated restoration/SQL CI baseline. Preserve all production data and current history until a reviewed recovery plan authorizes specific actions.

This package is completed; recovery work has not begun.
