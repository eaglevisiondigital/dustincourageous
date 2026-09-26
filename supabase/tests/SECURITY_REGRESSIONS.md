# Security regression execution

These tests require a provisioned Adventure Club database and database-administrator test access. The incomplete historical migration set is not a fresh-database bootstrap. Do not run db reset/db push/history repair to make these tests runnable.

## Actual-role suites

Run each SQL file in one fresh session with ON_ERROR_STOP enabled:

- guardian_pin_security_regression.sql — 29 checks.
- guardian_rpc_security_regression.sql — 21 checks.
- book_adventure_security_regression.sql — 19 checks.
- admin_launch_security_regression.sql — 16 checks.

Each script starts a transaction, creates random synthetic users/households and rolls back. Real functions, RLS and triggers are exercised as authenticated/anon with administrator-set Auth claims. The synthetic users have no email, password or Auth-issued session. Token values remain inside temporary tables and are not returned as test output.

Guardian/Book fixtures need published catalog visibility. Only their synthetic rows are updated with session_replication_role=replica during setup, then origin is restored before the tested calls. No real content, governance approval, helper definition or RLS policy changes. An error must terminate/close the session so its transaction rolls back.

Example, using standard libpq connection environment/service settings:

    psql -X -v ON_ERROR_STOP=1 -f supabase/tests/guardian_pin_security_regression.sql

Keep connection credentials outside command arguments and source control.

## Independent-session PIN test

For a normal direct database connection:

    PYTHONDONTWRITEBYTECODE=1 python3 supabase/tests/guardian_pin_concurrency.py

Set PSQL to an absolute psql binary if it is not on PATH. The harness uses six connections plus a row-lock holder. It requires at least two observed blocked requests, all denied results, persisted cooldown, no sessions and denial of a correct PIN during cooldown.

For a connector that serializes requests, use:

    PYTHONDONTWRITEBYTECODE=1 python3 supabase/tests/guardian_pin_concurrency_cron.py --sql-bundle

This prints the exact SQL phases without executing them. Through the authenticated SQL connector, execute setup, run, correct_during_lock, verify and ALWAYS cleanup in a finally block. Check the same assertions implemented in the Python runner. The live September 26 run used this transport and observed all six sessions blocked, all six jobs succeeded, no failed jobs, active cooldown and no tokens.

The cron driver uses the already-installed pg_cron, schedules six synthetic test jobs at a 30-second interval and unregisters the batch immediately after completion. Each job runs the tested RPC as authenticated. The normal script invocation without --sql-bundle performs the same phases through psql.

Concurrency requires temporarily committed fixture rows; finally cleanup removes them and verifies zero users/profiles/homes/members/subscriptions/preferences/PINs/sessions/notifications/audit rows. The cron variant also removes test jobs and run records. A killed host cannot run finally: retain the printed synthetic identifiers/SQL bundle and execute its exact cleanup phase. Never remove another job or household by a broad name match.

These are explicit database regression tests, not operational automations or provider invocations. GitHub CI currently verifies the app/build/Edge syntax; it does not run SQL against production. An isolated database test baseline belongs to the next approved recovery package.
