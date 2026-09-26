#!/usr/bin/env bash
set -euo pipefail
# Fixed, disposable CLI container only. No remote connection or credential input.
# The managed supabase_admin role is needed to restore its own default ACLs.
# Database tests still SET LOCAL ROLE authenticated/anon and assert RLS enforcement.
exec docker exec -i --env PGOPTIONS \
  supabase_db_dc-recovery-isolated \
  psql -h /var/run/postgresql -p 5432 -U supabase_admin -d postgres "$@"
