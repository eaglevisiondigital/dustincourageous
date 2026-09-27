#!/usr/bin/env python3
"""Connector-friendly concurrency test using the already-installed pg_cron.

The SQL connector may serialize requests. This test starts six independent
database sessions instead. Each checks the PIN as authenticated; the controller
unregisters the test batch on completion. No production job is changed.
Use --sql-bundle to execute through a SQL connector with finally cleanup.
The default psql runner uses the same libpq environment as the sibling harness.
"""
import json
import sys

from guardian_pin_concurrency import bundle, query


def cron_bundle():
    phases = bundle()
    actor, home, tag = (phases["fixture"][key] for key in ("actor", "household", "tag"))
    jobs = []
    for number in range(6):
        name = f"{tag}_{number}"
        command = f"""
begin;
set local statement_timeout='30s';
set local application_name='{tag}_attempt';
set local request.jwt.claim.sub='{actor}';
set local request.jwt.claims='{{}}';
set local role authenticated;
do $attempt$ begin
 if current_user<>'authenticated' then raise exception 'Wrong test role'; end if;
 if public.create_guardian_unlock_session('{home}','111111') is not null then
   raise exception 'Wrong PIN issued a token';
 end if;
end $attempt$;
commit;
"""
        jobs.append(f"insert into dc_pin_jobs select cron.schedule('{name}','30 seconds',$job${command}$job$);")
    phases["run"] = f"""
begin;
set local statement_timeout='30s';
create temp table dc_pin_jobs(jobid bigint);
create temp table dc_pin_observed(blocked integer);
{chr(10).join(jobs)}
commit;
begin;
set local statement_timeout='40s';
-- This transaction holds the same mutex the actual verifier must acquire.
do $observe$
declare blocked integer:=0;
begin
 perform 1 from private.household_guardian_security where household_id='{home}' for update;
 for i in 1..175 loop
  perform pg_stat_clear_snapshot();
  select count(*) into blocked from pg_stat_activity
   where application_name='{tag}_attempt' and cardinality(pg_blocking_pids(pid))>0;
  exit when blocked=6;
  perform pg_sleep(0.2);
 end loop;
 insert into dc_pin_observed values(blocked);
end $observe$;
commit;
-- Release the mutex, then wait for all six real transactions to finish.
do $finish$
begin
 for i in 1..75 loop
  exit when (select count(*) from cron.job_run_details r join dc_pin_jobs j using(jobid)
    where r.status in ('succeeded','failed'))>=6;
  perform pg_sleep(0.2);
 end loop;
end $finish$;
-- Unregister after completion, before the next 30-second tick. Unscheduling
-- a running job can label it failed/canceled even when its transaction commits.
select cron.unschedule(jobid) from dc_pin_jobs;
select json_build_object(
 'blocked_observed',(select blocked from dc_pin_observed),
 'runs',(select count(*) from cron.job_run_details r join dc_pin_jobs j using(jobid)),
 'succeeded',(select count(*) from cron.job_run_details r join dc_pin_jobs j using(jobid) where r.status='succeeded'),
 'failed',(select count(*) from cron.job_run_details r join dc_pin_jobs j using(jobid) where r.status='failed'),
 'remaining_jobs',(select count(*) from cron.job where jobname like '{tag}_%'),
 'failed_attempts',failed_attempts,
 'cooldown_active',locked_until>clock_timestamp()+interval '14 minutes',
 'cooldown_within_limit',locked_until<=clock_timestamp()+interval '15 minutes',
 'sessions',(select count(*) from private.guardian_unlock_sessions where household_id='{home}')
) as evidence from private.household_guardian_security where household_id='{home}';
"""
    phases["cleanup"] = f"""
begin;
select cron.unschedule(jobid) from cron.job where jobname like '{tag}_%';
commit;
""" + phases["cleanup"].replace(
        "delete from public.households",
        f"delete from cron.job_run_details where command like '%{tag}%';\ndelete from public.households",
    ).replace(
        "'users',(select count(*)",
        f"'cron_jobs',(select count(*) from cron.job where jobname like '{tag}_%'),"
        f"'cron_runs',(select count(*) from cron.job_run_details where command like '%{tag}%'),"
        "'users',(select count(*)",
    )
    return phases


def run(phases):
    print("Synthetic cleanup identifiers:", json.dumps(phases["fixture"]), flush=True)
    try:
        query(phases["setup"])
        result = query(phases["run"])
        assert result["blocked_observed"] >= 2, result
        assert result["runs"] == result["succeeded"] == 6, result
        assert result["failed"] == result["remaining_jobs"] == result["failed_attempts"] == result["sessions"] == 0, result
        assert result["cooldown_active"] and result["cooldown_within_limit"], result
        assert query(phases["correct_during_lock"])["denied"]
        print(json.dumps(result))
    finally:
        cleanup = query(phases["cleanup"])
        assert cleanup and all(value == 0 for value in cleanup.values()), cleanup
        print("Fixture cleanup verified:", json.dumps(cleanup))


if __name__ == "__main__":
    phases = cron_bundle()
    if sys.argv[1:] == ["--sql-bundle"]:
        print(json.dumps(phases))
    elif sys.argv[1:]:
        raise SystemExit("Usage: guardian_pin_concurrency_cron.py [--sql-bundle]")
    else:
        run(phases)
