-- Diagnostic evidence for S1, not a passing security regression.
-- Synthetic users/household only. Run as database administrator in one session.
-- Do not remove ROLLBACK. No email, credentials, real family IDs or provider calls.
-- Expected secure behavior: failed attempts persist and the fifth call locks.
-- Observed 2026-09-26: failed_attempts=0, locked=false after six failures.
begin;
set local statement_timeout='15s';
create temp table dc_pin_audit_fixture as
  select gen_random_uuid() as actor, gen_random_uuid() as home;
grant select on dc_pin_audit_fixture to authenticated;
insert into auth.users(id,raw_app_meta_data,raw_user_meta_data)
  select actor,'{}','{}' from dc_pin_audit_fixture;
insert into public.households(id,name,created_by)
  select home,'DC PIN audit rollback fixture',actor from dc_pin_audit_fixture;
select set_config('request.jwt.claim.sub',
  (select actor::text from dc_pin_audit_fixture),true);
set local role authenticated;
select public.set_guardian_pin((select home from dc_pin_audit_fixture),'739251');
do $$
begin
  for i in 1..6 loop
    begin
      perform public.create_guardian_unlock_session(
        (select home from dc_pin_audit_fixture),'111111');
      raise exception 'Unexpected PIN accepted';
    exception when raise_exception then
      if sqlerrm <> 'Guardian PIN was not accepted' then raise; end if;
    end;
  end loop;
end $$;
reset role;
select failed_attempts,locked_until is not null as locked
from private.household_guardian_security
where household_id=(select home from dc_pin_audit_fixture);
rollback;
