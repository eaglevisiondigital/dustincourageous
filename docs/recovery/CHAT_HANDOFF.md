RECOMMENDED THINKING LEVEL: HIGH

CHAT DECISION NEEDED

PROJECT: Dustin Courageous

The authorized backend recovery/reproducibility package is complete. Please review
`docs/audits/2026-09-26-recovery.md` and select the next bounded build package.
Do not restart the backend or repeat the completed guardian PIN/RPC repairs.

Repository: `eaglevisiondigital/dustincourageous`
Branch: `build/adventure-club-app`
Dedicated Supabase: Dustin Courageous Adventure Club / `vrixketvinzhsfwwcqiu`
Security repair: `baa054dd8073e13f1c3feab5fdb7d9ab3f35a2e7`
Recovery implementation: `0df0c18`, `98c0cd0`, `5958a64`, `ae9e6e7`; documentation follows.
Main remains `57b37be469569b909095172de0cd5bc392a755b8` and was not modified.

COMPLETED / CHANGED

All 40 live migration SQL records are archived exactly and mapped to all 24
unchanged root migrations. Twelve timestamps differ; 16 records previously had
no source file. All related SQL is verified: 21 byte-exact and three equal parsed
SQL with only comments/whitespace differences. Seventy current tables and 131
functions have no recorded CREATE in those 40 records, so a separate current-state
catalog/bootstrap recovers their actual deployed definitions. No history was
renamed, repaired or replayed. All ten deployed Edge sources are now tracked;
six missing directories and two import maps were recovered exactly. No live
migration, data mutation, Auth change, Edge deployment or provider activation
occurred in recovery.

TESTED

Fresh isolated restoration reproduces 112 public tables with RLS, eight private
tables, 25 invoker views, 213 functions, 166 triggers, 631 constraints, 432 indexes,
298 public/seven Storage policies, four identity sequences, four buckets and five
inactive cron definitions. Native PostgreSQL and full local Supabase CI verify
the captured application catalog and effective ACLs before and after testing.
Ten SQL suites include the 85 security checks, 13 household RLS checks, onboarding
and reader/privacy/launch regressions. Real concurrent PIN attempts persist
cooldown and issue no tokens; cleanup is verified. All 280 app tests, production
build and ten-function Edge syntax checks pass. CI uses no production credentials.

Successful Supabase run:
https://github.com/eaglevisiondigital/dustincourageous/actions/runs/36278291652
Final implementation `ae9e6e7` verification: both CI jobs passed.
https://github.com/eaglevisiondigital/dustincourageous/actions/runs/36278951290

SECURITY / UNRESOLVED

The completed PIN/RPC repair is preserved. Broad legacy table/view/default ACLs
and seven implicit PUBLIC helper grants are explicitly inventoried, unchanged
and not approved as a launch policy. Both client roles have administrative SQL
privileges including TRUNCATE on 111 public tables; RLS does not govern TRUNCATE.
Leaked-password protection remains disabled. The known guarded revoke-session
SECURITY DEFINER advisor warning remains intentional and tested.

The recovered Edge review flags targeted follow-up for CORS/rate limits, privacy
export races, legacy adapter HTTPS/secrets/redaction, provider-test browser behavior
and safe retirement of unused endpoints. A one-day aggregate log sample shows
the v2 notification worker and privacy cleanup active; other endpoint inactivity
is not proof they can be removed. No legacy endpoint was deleted.

This is source/schema recovery, not a customer-data backup or launch acceptance.
Protected data/Auth backups, files, current reference/business data, full Auth
configuration and fresh destination secrets are still required for disaster
recovery. Full creative authority files, corrected Book 1 assets/human approval,
real Auth/Storage/browser/device journeys and provider acceptance remain open.

DOCUMENTATION

Read `CURRENT_BUILD_STATE.md`, `docs/audits/2026-09-26-recovery.md`, and
`docs/recovery/{RECOVERY_RUNBOOK,MIGRATION_HISTORY_MAP,EDGE_FUNCTION_AUDIT,LEGACY_GRANTS}.md`.
The original historical migrations remain evidence, not a valid fresh replay path.
Use `supabase/recovery/run.py` and its isolated CI for future recovery verification.

NEXT RECOMMENDED BUILD / DECISION REQUEST

Please choose and authorize the next bounded package. Recommended priority is
dependency-aware least-privilege/Auth launch hardening, with targeted Edge fixes
and Work-led acceptance scoped from this audit. Decide the intended grant policy,
whether to enable leaked-password protection, and the acceptance/deployment order.
Codex has not started that package. Chat owns strategy/approvals; Codex implements;
Work owns external systems and live user-journey validation. No production cutover,
main merge, provider activation or content approval is authorized by this report.
