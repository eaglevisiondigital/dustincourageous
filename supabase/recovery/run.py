#!/usr/bin/env python3
"""Bootstrap and test a NEW, isolated database; never accepts a remote address.

Usage: run.py --native-socket /tmp/dc-recovery-pgsocket --port 55439
       run.py --supabase --port 55432
Database/user are fixed to postgres; no production credentials are read.
"""
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--native-socket')
    mode.add_argument('--supabase', action='store_true')
    parser.add_argument('--port', type=int, required=True)
    parser.add_argument('--verify-only', action='store_true')
    parser.add_argument('--resume-tests', action='store_true', help='Rerun tests after a verified existing isolated restoration')
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error('Use a non-system local test port')
    if args.native_socket:
        socket = Path(args.native_socket).resolve()
        if not socket.is_dir() or not str(socket).startswith(('/private/tmp/dc-recovery-', '/tmp/dc-recovery-')):
            parser.error('Native socket must be a dedicated /tmp/dc-recovery-* directory')
        host = str(socket)
    else:
        host = '127.0.0.1'
    # Discard all inherited libpq options (including services/host overrides/secrets).
    env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
    env.update(PGHOST=host, PGPORT=str(args.port), PGUSER='postgres', PGDATABASE='postgres',
               PGPASSWORD='postgres' if args.supabase else '', PGPASSFILE='/dev/null',
               PGOPTIONS='-c dc.recovery_mode=isolated -c client_min_messages=warning',
               PGCONNECT_TIMEOUT='5')
    psql = env.get('PSQL', 'psql')

    def sql(value, capture=False):
        result = subprocess.run([psql, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'],
                                input=value, env=env, text=True, capture_output=True, timeout=180)
        if result.returncode:
            sys.stderr.write(result.stderr)
            raise SystemExit('Isolated SQL failed; see error above. No subsequent phases ran.')
        if capture:
            return result.stdout
        if result.stdout.strip():
            print(result.stdout.strip(), flush=True)

    if not args.verify_only and not args.resume_tests:
        # Check before even installing the native adapter or managed extensions.
        sql("DO $$ BEGIN IF to_regclass('public.households') IS NOT NULL OR "
            "to_regclass('private.household_guardian_security') IS NOT NULL THEN "
            "RAISE EXCEPTION 'Fresh test database required'; END IF; END $$;")
        if args.native_socket:
            sql((ROOT / 'native-platform.sql').read_text())
            platform = json.loads((ROOT / 'platform.json').read_text())
            sql('\n'.join(x['definition'] + ';' for x in platform['platform_function_dependencies']))
        else:
            sql((ROOT / 'supabase-platform.sql').read_text())
        print('Applying current-state bootstrap to isolated local database', flush=True)
        sql((ROOT / 'bootstrap.sql').read_text())
        jobs = json.loads((ROOT / 'platform.json').read_text())['jobs']
        from generate import literal
        for job in jobs:
            if args.native_socket:
                sql('INSERT INTO cron.job(jobname,schedule,command,active) VALUES (' +
                    ','.join(literal(job[k]) for k in ('jobname', 'schedule', 'command')) + ',false);')
            else:
                # Install then disable in the SAME transaction: no active job is visible.
                sql('BEGIN; SELECT cron.schedule(' + ','.join(literal(job[k]) for k in ('jobname', 'schedule', 'command'))
                    + '); UPDATE cron.job SET active=false WHERE jobname=' + literal(job['jobname']) + '; COMMIT;')
    actual = json.loads(sql((ROOT / 'catalog-query.sql').read_text(), capture=True))
    from verify import verify_catalog
    verify_catalog(actual, native=bool(args.native_socket))
    sql((ROOT / 'invariants.sql').read_text())
    jobs = json.loads(sql("select json_agg(json_build_object('jobname',jobname,'schedule',schedule,'command',command,'active',active) order by jobname) from cron.job;", capture=True))
    expected_jobs = json.loads((ROOT / 'platform.json').read_text())['jobs']
    assert jobs == [dict(j, active=False) for j in expected_jobs], 'Cron representation drift or active schedule'
    if args.verify_only:
        print('Catalog, security invariants and paused schedule verification passed', flush=True)
        return
    sql((ROOT / 'test-seed.sql').read_text())
    suites = [
        'guardian_pin_security_regression.sql', 'guardian_rpc_security_regression.sql',
        'book_adventure_security_regression.sql', 'admin_launch_security_regression.sql',
        'deployed_household_rls_regression.sql', 'household_onboarding_regression.sql',
        'guardian_decision_regression.sql', 'digital_book_reader_regression.sql',
        'reading_privacy_regression.sql', 'digital_book_launch_gate_regression.sql',
    ]
    for name in suites:
        print('Running ' + name, flush=True)
        sql((REPO / 'supabase/tests' / name).read_text())
    print('Running real concurrent authenticated PIN attempts', flush=True)
    subprocess.run([sys.executable, str(REPO / 'supabase/tests/guardian_pin_concurrency.py')],
                   env=env, check=True, timeout=90)
    # Transactional regressions must leave all application definitions unchanged.
    verify_catalog(json.loads(sql((ROOT / 'catalog-query.sql').read_text(), capture=True)), native=bool(args.native_socket))
    sql((ROOT / 'invariants.sql').read_text())
    print('PASS: isolated restoration, 10 SQL suites, concurrency and post-test catalog verification', flush=True)


if __name__ == '__main__':
    main()
