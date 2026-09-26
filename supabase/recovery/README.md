# Isolated database recovery baseline

This directory reconstructs the **2026-09-26 current application schema** from a
read-only capture of `vrixketvinzhsfwwcqiu`. It does not replay or repair production
migration history. No production data, Auth accounts, files or secret values are
included. Nothing in this package activates providers or deploys Edge Functions.

- `catalog.json` / `catalog-query.sql`: current definitions and explicit ACL evidence.
- `generate.py` / `bootstrap.sql`: deterministic current-state schema restore.
- `history/`: 40 exact historical SQL records, evidence only; **do not execute**.
- `platform.json`: five schedules and four Auth function dependencies, no secrets.
- `run.py`, `verify.py`, `invariants.sql`: localhost-only restore and security gate.
- `test-seed.sql`: clearly synthetic test references, never approved business data.
- `native-platform.sql`: limited PostgreSQL adapter for development without Docker.
- `local/`: separate Supabase CLI project with historical migration replay disabled.

Read [the recovery runbook](../../docs/recovery/RECOVERY_RUNBOOK.md) and
[legacy grant inventory](../../docs/recovery/LEGACY_GRANTS.md) before using this
baseline. The captured broad legacy table/default grants are preserved explicitly
for isolated fidelity; they remain a security hardening decision for Chat.

## Full local Supabase gate (Docker, Node 24, Python 3, psql)

```sh
npx --yes supabase@2.118.0 start --workdir supabase/recovery/local --exclude studio,postgres-meta,realtime,imgproxy,mailpit,edge-runtime,logflare,vector,supavisor
python3 supabase/recovery/run.py --supabase --port 55432
npx --yes supabase@2.118.0 stop --workdir supabase/recovery/local --no-backup
```

Use a fresh disposable instance. The runner refuses remote hosts and an existing
application schema, strips inherited database connection/credential settings,
compares the entire application catalog and effective privileges, runs ten SQL
suites and real concurrent PIN attempts, then rechecks the catalog. Schedules are
installed inactive in the same transaction. Auth, Storage HTTP, provider callbacks
and browser user journeys need separate end-to-end acceptance.

No `db push`, `db reset`, link, migration repair or production credentials are used.
