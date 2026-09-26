# Recovery runbook — schema/source baseline, September 26, 2026

This package reconstructs the current Dustin application schema and preserves all
ten deployed Edge sources. It is a **schema/source recovery baseline**, not a
backup of families, Auth accounts, purchased access, approved content or Storage
files. Use a separately verified data/file/configuration backup for disaster
recovery. A successful synthetic test does not authorize production cutover.

## Source of truth and boundaries

| Artifact | Role |
| --- | --- |
| `supabase/recovery/catalog.json` | Read-only current catalog capture; no family/Auth rows or secret values |
| `catalog-query.sql` | Auditable capture query; returns schema metadata and bucket definitions |
| `generate.py` / `bootstrap.sql` | Deterministic current-state bootstrap, separate from migration history |
| `history/` / `history-map.json` | Exact 40 recorded SQL bodies and mapping to all 24 original root migrations |
| `platform.json` | Five recorded cron commands/schedules and four Auth helper dependencies |
| `edge-source-manifest.json` / `supabase/functions/` | All ten exact deployed sources, file hashes and environment variable names |
| `supabase/functions/deployed-settings.toml` | Inert gateway JWT/import/entrypoint configuration evidence |
| `test-seed.sql` | Synthetic consent policy, entitlement and reference book for isolated tests only |

The current-state snapshot includes 112 public tables with RLS, eight private
tables, 25 invoker views, 213 functions, 298 public and seven Storage policies,
166 application/Auth triggers, four identity sequences, constraints, indexes,
defaults, owners and effective ACLs. Sequence definitions are preserved; production
sequence positions are data-backup responsibilities. No custom enums/domains,
standalone composite/range types, inheritance, custom column collations, custom
operators/rules, foreign or unlogged tables were found. There are no application
event triggers or publication entries to restore.

The capture/generator is deliberately bounded to those verified object classes.
If future schema changes add unsupported features, extend the capture, renderer
and verifier before refreshing the baseline. Do not silently export only part of
the schema. Historical source is immutable evidence; future approved changes use
forward migrations and update the isolated baseline/tests deliberately.

## Supported isolated Supabase workflow

Prerequisites: Docker, Node 24, Python 3 and `psql`. The pinned CLI is 2.118.0,
PostgreSQL major 17. Official workflow references:
[local development](https://supabase.com/docs/guides/local-development) and
[managing environments](https://supabase.com/docs/guides/deployment/managing-environments).

From the repository root:

```sh
python3 supabase/recovery/generate.py
git diff --exit-code -- supabase/recovery/bootstrap.sql
npx --yes supabase@2.118.0 start --workdir supabase/recovery/local --exclude studio,postgres-meta,realtime,imgproxy,mailpit,edge-runtime,logflare,vector,supavisor
python3 supabase/recovery/run.py --supabase --port 55432
npx --yes supabase@2.118.0 stop --workdir supabase/recovery/local --no-backup
```

The separate CLI project prevents root historical migrations from being applied.
It has migrations/seeding disabled, no link to a hosted project, and its own
project identifier/ports. Keep it disposable. `--no-backup` removes **that isolated
CLI instance's** volumes; do not point these commands at any other project.

The runner accepts only the fixed local CLI container or a dedicated `/tmp`
Unix-socket directory. It strips inherited `PG*` connection settings. Managed
restoration connects through `docker exec` to the fixed
`supabase_db_dc-recovery-isolated` container as its existing `supabase_admin`
role, using an internal Unix socket. This is required to restore that owner's
default ACLs; the normal `postgres` role cannot change them. No password or
production credential is read, and no client role is elevated.
It refuses an existing application schema or a Supabase platform containing
users, objects, secrets or jobs. The SQL bootstrap additionally requires an
isolated-mode setting and an empty application schema. These are guardrails,
not permission to bypass review by manually executing the SQL elsewhere.

The gate performs:

1. Managed extension/Auth/Storage prerequisite checks, then a transactional schema
   restore using current definitions rather than historical transitions.
2. Bucket definitions and seven Storage policies; no real file uploads.
3. Five cron definitions installed **inactive in the same transaction**. No
   historical active job can run before the transaction disables it.
4. Complete application catalog and effective ACL comparison. Object signatures,
   function bodies, policies, triggers, indexes, constraints, defaults, column
   grants, RLS, view options and ownership must match the captured source.
5. Additional client-role/private-table/guarded-RPC invariants; no active jobs or
   Vault secrets are allowed.
6. Four current security suites (85 checks), household RLS (13 checks), onboarding,
   guardian decisions, reader, reading privacy and digital launch-gate regressions.
7. Six independent authenticated PIN attempts contending on the real household
   row lock, persistent cooldown, correct-PIN denial during cooldown, zero tokens,
   and verified cleanup. The test intentionally commits only synthetic fixtures
   for cross-connection visibility and removes them in `finally`.
8. A second complete catalog comparison after the tests, proving temporary
   replacements/fixture setup did not leave altered definitions behind.

`--verify-only` checks an existing isolated restoration without rerunning fixtures.
`--resume-tests` verifies the catalog first and reruns the explicitly synthetic
seed/suites. Neither option permits remote connection parameters.

The workflow `.github/workflows/adventure-club-ci.yml` uses the same gate on a
fresh GitHub runner. It has no production database URL, access token, project link
or provider secret. Startup runs actual local Supabase Auth and Storage services;
the SQL tests impersonate database roles with synthetic claims, not browser Auth
sessions. Normal application tests/build and all ten Edge entrypoint syntax checks
run in the companion CI job.

## Native PostgreSQL development fallback

The current Mac lacks Docker. Native PostgreSQL 17.11 can exercise the unchanged
application schema and real SQL roles/RLS using `native-platform.sql` on a new
private Unix socket. It supplies only the platform objects needed by the SQL
tests: minimal Auth/Storage tables, captured Auth helper functions, an empty Vault
view, inactive cron representation, and a `net.http_post` function that raises
instead of sending network requests.

Example, with PostgreSQL 17 binaries on PATH and unused `/tmp` paths:

```sh
mkdir -m 700 /tmp/dc-recovery-example-socket
initdb -D /tmp/dc-recovery-example-data -U postgres --auth-local=trust --auth-host=reject --no-locale -E UTF8
pg_ctl -D /tmp/dc-recovery-example-data -l /tmp/dc-recovery-example.log -o "-k /tmp/dc-recovery-example-socket -p 55439 -c listen_addresses=''" start
python3 supabase/recovery/run.py --native-socket /tmp/dc-recovery-example-socket --port 55439
pg_ctl -D /tmp/dc-recovery-example-data stop
```

Native results do not prove managed extension behavior, Vault encryption, cron
scheduling, Auth login, Storage HTTP or Edge/Deno execution. Supabase CI covers
the managed SQL prerequisite/restore differences; Work still owns live journey
acceptance. Minor PostgreSQL/extension versions are reported separately and may
differ; the verifier requires PostgreSQL major 17 and the required extension set.

## Recovery dependencies that are intentionally not fabricated

| Dependency | Required separate input / treatment |
| --- | --- |
| Family and commerce data | Verified backup with foreign-key consistency and sequence positions; never Git |
| Auth users/identities/MFA/sessions | Managed Auth backup/recovery procedure and explicit session/credential policy |
| Approved reference/business data | Current plans/entitlements, consent versions/text, products/pricing, governance registry/approvals and content; historical seed SQL is not current authority |
| Storage content | Object metadata plus actual files; four bucket definitions alone do not restore artwork, book pages or exports |
| Auth configuration | Site/redirect URLs, email/templates/provider settings, rate limits and security settings need a separate protected configuration record; full Auth configuration was not exported here |
| Leaked-password protection | Still disabled; unchanged, unresolved launch-hardening decision |
| Private security rows | Existing PIN/token/invitation hashes belong in encrypted operational backups; never source control |
| Vault/Edge/provider secrets | Generate/rotate in the new destination; never reuse production secrets in tests |
| Edge deployment/runtime | Deploy recovered source with captured gateway flags only after destination review; TypeScript syntax checking is not full Deno/provider execution |
| Realtime | No current application publication entries; do not invent subscriptions/publications |

Worker activation needs matching entries for `private.worker_auth_tokens`
(`notification-delivery-worker`) and Vault names `dc_project_url` and
`dc_notification_delivery_worker_token`. Cleanup needs the matching private
system-secret hash plus Vault names `privacy_export_project_url` and
`privacy_export_cleanup_secret`. Record names only; configure fresh values through
the approved secret-management process. Do not put them in this repository.

For the five schedules, preserve the captured commands, time expressions and
destination assumptions. They stay inactive until data, provider/secret setup,
URLs, delivery preferences and rollback behavior are reviewed in the new system.
The launch gate correctly reports missing provider/active-cron requirements as
blockers in an isolated restore; tests must not force those checks to pass.

## Production history and future deployment

Do not run root `db push`, `db reset`, migration repair or archived SQL to make
40/24 counts match. Keep the 12 timestamp differences recorded. Production-only
history and the 70 table/131 function creation gaps are explained in the
[migration map](MIGRATION_HISTORY_MAP.md). Original chronology gaps remain, but
current source restoration no longer depends on reconstructing that chronology.

Any hosted recovery/cutover needs a separate plan approved by Chat: destination
identity/ownership, encrypted data/file recovery, reference/creative authority,
Auth/provider configuration, reviewed legacy grant hardening, staged Edge deploy,
acceptance and rollback. This package makes that plan reviewable; it does not
create a hosted project, change history, approve content or activate services.

## Refreshing the baseline

After a future approved forward migration, capture the relevant catalog through
a read-only administrative connection, inspect for secrets/data, update source
and regenerate. Preserve large sequence bounds as text to avoid JSON number
rounding. Run a fresh isolated gate and update this report with the commit/CI
evidence. Compare live metadata before any future deployment. The optional
offline `forensics.py` uses `pglast==7.11` to regenerate the historical mapping;
ordinary restore/CI needs only Python's standard library.
