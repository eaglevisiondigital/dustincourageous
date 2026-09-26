-- Isolated function-logic regression test. All fixtures and function copies are
-- temporary and rolled back. This does not exercise production RLS, XP triggers,
-- or two simultaneous database sessions.
begin;
create temporary table child_profiles (id uuid primary key, household_id uuid);
create temporary table challenges (id uuid primary key, parent_approval_required boolean);
create temporary table child_challenge_progress (
  id uuid primary key, child_profile_id uuid, challenge_id uuid,
  status text, submitted_at timestamptz
);

create function pg_temp.guardian_unlock_session_valid(household_id uuid, token text)
returns boolean language plpgsql as $test$
begin
  if token <> 'fixture-valid' then return false; end if;
  -- Deterministically simulate a competing write between the read and update.
  if current_setting('test.guardian_race', true) = 'completed' then
    update pg_temp.child_challenge_progress set status = 'completed';
  elsif current_setting('test.guardian_race', true) = 'resubmitted' then
    update pg_temp.child_challenge_progress set submitted_at = submitted_at + interval '1 minute';
  end if;
  return true;
end;
$test$;

do $test$
declare
  definition text;
begin
  for definition in
    select pg_get_functiondef(p.oid)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('approve_parent_challenge', 'return_parent_challenge')
  loop
    definition := replace(definition, 'public.', 'pg_temp.');
    definition := replace(definition, 'private.guardian_unlock_session_valid', 'pg_temp.guardian_unlock_session_valid');
    execute definition;
  end loop;
end;
$test$;

insert into pg_temp.child_profiles values ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
insert into pg_temp.challenges values ('00000000-0000-0000-0000-000000000003',true);
insert into pg_temp.child_challenge_progress values (
  '00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003','pending_parent','2026-09-24T12:00:00Z'
);

do $test$
declare
  progress_id constant uuid := '00000000-0000-0000-0000-000000000004';
  action text;
  race text;
  rejected boolean;
begin
  perform pg_temp.approve_parent_challenge(progress_id, 'fixture-valid');
  if (select status from pg_temp.child_challenge_progress) <> 'completed' then
    raise exception 'Approval did not complete the pending challenge';
  end if;
  rejected := false;
  begin
    perform pg_temp.return_parent_challenge(progress_id, 'fixture-valid');
  exception when others then
    if sqlerrm <> 'Pending challenge approval not found' then raise; end if;
    rejected := true;
  end;
  if not rejected then raise exception 'Completed challenge was returned'; end if;

  update pg_temp.child_challenge_progress set status = 'pending_parent';
  perform pg_temp.return_parent_challenge(progress_id, 'fixture-valid');
  if (select status <> 'in_progress' or submitted_at is not null from pg_temp.child_challenge_progress) then
    raise exception 'Return did not reset pending submission';
  end if;

  for action in select unnest(array['approve_parent_challenge','return_parent_challenge']) loop
    update pg_temp.child_challenge_progress
      set status = 'pending_parent', submitted_at = '2026-09-24T12:00:00Z';
    rejected := false;
    begin
      execute format('select pg_temp.%I($1,$2)', action) using progress_id, 'fixture-invalid';
    exception when others then
      if sqlerrm <> 'Guardian unlock session is invalid or expired' then raise; end if;
      rejected := true;
    end;
    if not rejected then raise exception 'Invalid guardian session was accepted'; end if;

    for race in select unnest(array['completed','resubmitted']) loop
      perform set_config('test.guardian_race', race, true);
      rejected := false;
      begin
        execute format('select pg_temp.%I($1,$2)', action) using progress_id, 'fixture-valid';
      exception when others then
        if sqlerrm <> 'Challenge changed while being reviewed. Refresh the approval queue.' then raise; end if;
        rejected := true;
      end;
      if not rejected then raise exception 'Stale % action accepted for %', action, race; end if;
      perform set_config('test.guardian_race', '', true);
    end loop;
  end loop;
end;
$test$;
select 'PASS: approval, return, completed protection, invalid sessions, and stale decisions' as result;
rollback;
