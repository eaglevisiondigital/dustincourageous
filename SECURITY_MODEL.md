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

## Unresolved recovery and hardening

- 16 historical migration names lack files; 12 timestamps differ. The new forward migration matches its live timestamp, making totals 40 live entries / 24 files without changing that old debt.
- Six deployed Edge sources remain missing. Fresh restoration and isolated SQL CI remain unverified.
- Older public tables retain broad SQL grants, including TRUNCATE/REFERENCES/TRIGGER; RLS does not govern TRUNCATE. No browser/REST truncate exploit was demonstrated. Broader grant review remains separate.
- Some old private helpers retain inherited anonymous EXECUTE despite anon lacking schema USAGE; broad grant cleanup is separate.
- Real Auth sessions, Storage HTTP, browser/device acceptance and provider lifecycle checks remain pending.
- Legacy deployed functions and aggregated adult catalog/media access still need broader dependency/acceptance review.

Recovery guidance: prefer a corrective forward migration. Revoking the three newly added helper EXECUTE grants fails the affected paths closed; restoring the old unlock body would restore the lockout defect. Reverting revocation to invoker would again break its private-table access. Do not replay or edit historical migrations.
