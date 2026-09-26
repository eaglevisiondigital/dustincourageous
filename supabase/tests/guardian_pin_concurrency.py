#!/usr/bin/env python3
"""Concurrent PIN regression against a provisioned Adventure Club database.

Uses standard libpq environment/service settings and PSQL (default: psql).
Requires database-administrator access for fixture setup and lock observation.
Each attempt uses a separate connection, SET LOCAL ROLE authenticated and Auth
claims. No emails/passwords/Auth sessions, child records or outbound calls.
A short-lived synthetic household is committed for cross-session visibility.
Cleanup runs in finally; SIGKILL/host loss requires the printed fixture IDs.

--sql-bundle prints the exact phases for an authenticated SQL connector.
It does not run them. The connector runner must preserve the same ordering,
concurrency, assertions and finally cleanup as run().
"""
import concurrent.futures
import json
import os
import subprocess
import sys
import time
import uuid


def bundle():
    actor, home = str(uuid.uuid4()), str(uuid.uuid4())
    tag = "dc_pin_" + uuid.uuid4().hex[:12]
    auth = f"""
begin;
set local statement_timeout='45s';
set local application_name='{tag}_attempt';
set local request.jwt.claim.sub='{actor}';
set local request.jwt.claims='{{}}';
set local role authenticated;
"""
    return {
        "fixture": {"actor": actor, "household": home, "tag": tag},
        "setup": f"""
begin;
set local statement_timeout='15s';
insert into auth.users(id,raw_app_meta_data,raw_user_meta_data)
 values('{actor}','{{}}'::jsonb,'{{}}'::jsonb);
insert into public.households(id,name,created_by)
 values('{home}','DC PIN concurrency fixture {tag}','{actor}');
set local request.jwt.claim.sub='{actor}';
set local request.jwt.claims='{{}}';
set local role authenticated;
do $$ begin perform public.set_guardian_pin('{home}','739251'); end $$;
commit;
select true as setup_complete;
""",
        "hold": f"""
begin;
set local statement_timeout='35s';
set local application_name='{tag}_holder';
do $$ begin
 perform 1 from private.household_guardian_security
 where household_id='{home}' for update;
 perform pg_sleep(15);
end $$;
commit;
select true as holder_complete;
""",
        "observe": f"""
select json_build_object(
 'holder_ready',exists(select 1 from pg_stat_activity
   where application_name='{tag}_holder' and wait_event='PgSleep'),
 'blocked_attempts',(select count(*) from pg_stat_activity
   where application_name='{tag}_attempt' and cardinality(pg_blocking_pids(pid))>0)
) as evidence;
""",
        "attempt": auth + f"""
select json_build_object(
 'role_is_authenticated',current_user='authenticated',
 'denied',public.create_guardian_unlock_session('{home}','111111') is null
) as evidence;
commit;
""",
        "correct_during_lock": auth + f"""
select json_build_object(
 'denied',public.create_guardian_unlock_session('{home}','739251') is null
) as evidence;
commit;
""",
        "verify": f"""
select json_build_object(
 'failed_attempts',failed_attempts,
 'cooldown_active',locked_until>clock_timestamp()+interval '14 minutes',
 'cooldown_within_limit',locked_until<=clock_timestamp()+interval '15 minutes',
 'sessions',(select count(*) from private.guardian_unlock_sessions where household_id='{home}')
) as evidence
from private.household_guardian_security where household_id='{home}';
""",
        "cleanup": f"""
begin;
set local statement_timeout='15s';
delete from public.households where id='{home}' and created_by='{actor}'
 and name='DC PIN concurrency fixture {tag}';
delete from auth.users where id='{actor}' and email is null and encrypted_password is null;
commit;
select json_build_object(
 'users',(select count(*) from auth.users where id='{actor}'),
 'profiles',(select count(*) from public.profiles where id='{actor}'),
 'households',(select count(*) from public.households where id='{home}'),
 'members',(select count(*) from public.household_members where household_id='{home}' or user_id='{actor}'),
 'subscriptions',(select count(*) from public.household_subscriptions where household_id='{home}'),
 'preferences',(select count(*) from public.notification_preferences where user_id='{actor}'),
 'pin_rows',(select count(*) from private.household_guardian_security where household_id='{home}'),
 'sessions',(select count(*) from private.guardian_unlock_sessions where household_id='{home}'),
 'notifications',(select count(*) from public.user_notifications where user_id='{actor}'),
 'audit_rows',(select count(*) from public.admin_audit_log where actor_user_id='{actor}' or household_id='{home}')
) as evidence;
""",
    }


def query(sql):
    proc = subprocess.run(
        [os.environ.get("PSQL", "psql"), "-X", "-qAt", "-v", "ON_ERROR_STOP=1"],
        input=sql, text=True, capture_output=True, timeout=55, check=True,
    )
    rows = [line for line in proc.stdout.splitlines() if line.startswith("{")]
    return json.loads(rows[-1]) if rows else {}


def run(phases):
    print("Synthetic cleanup identifiers:", json.dumps(phases["fixture"]), flush=True)
    try:
        query(phases["setup"])
        with concurrent.futures.ThreadPoolExecutor(max_workers=7) as pool:
            holder = pool.submit(query, phases["hold"])
            deadline = time.monotonic() + 10
            while not query(phases["observe"])["holder_ready"]:
                if time.monotonic() >= deadline:
                    raise AssertionError("Row-lock holder was not observed")
                time.sleep(0.1)
            attempts = [pool.submit(query, phases["attempt"]) for _ in range(6)]
            blocked = 0
            deadline = time.monotonic() + 10
            while blocked < 2 and time.monotonic() < deadline:
                blocked = max(blocked, query(phases["observe"])["blocked_attempts"])
                time.sleep(0.1)
            results = [attempt.result() for attempt in attempts]
            holder.result()
        assert blocked >= 2, "No proof of simultaneous blocked PIN requests"
        assert all(r["role_is_authenticated"] and r["denied"] for r in results)
        state = query(phases["verify"])
        assert state == {"failed_attempts": 0, "cooldown_active": True,
                         "cooldown_within_limit": True, "sessions": 0}, state
        assert query(phases["correct_during_lock"])["denied"]
        assert query(phases["verify"]) == state
        print(json.dumps({"attempts": 6, "blocked_observed": blocked,
                          "state": state, "correct_pin_during_lock": "denied"}))
    finally:
        cleanup = query(phases["cleanup"])
        assert cleanup and all(value == 0 for value in cleanup.values()), cleanup
        print("Fixture cleanup verified:", json.dumps(cleanup))


if __name__ == "__main__":
    phases = bundle()
    if sys.argv[1:] == ["--sql-bundle"]:
        print(json.dumps(phases))
    elif sys.argv[1:]:
        raise SystemExit("Usage: guardian_pin_concurrency.py [--sql-bundle]")
    else:
        run(phases)
