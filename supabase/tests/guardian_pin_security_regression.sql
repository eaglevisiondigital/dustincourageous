-- Real deployed functions/roles. Synthetic records only; all changes roll back.
begin;
set local statement_timeout='30s';
create temp table dc_security_fixture as select
 gen_random_uuid() as a,gen_random_uuid() as b,gen_random_uuid() as c,
 gen_random_uuid() as home_a,gen_random_uuid() as home_b,
 gen_random_uuid() as child_a,gen_random_uuid() as child_b,
 gen_random_uuid() as book,gen_random_uuid() as challenge,
 gen_random_uuid() as progress_a,gen_random_uuid() as progress_b,
 gen_random_uuid() as badge,gen_random_uuid() as reward;
create temp table dc_security_checks(label text);
create temp table dc_security_tokens(label text primary key,token text);
grant select on dc_security_fixture to authenticated,anon;
grant select,insert,update,delete on dc_security_tokens to authenticated;
grant select,insert on dc_security_checks to authenticated,anon;
create function pg_temp.check(ok boolean,label text) returns void language plpgsql as $$
begin
 if ok is distinct from true then raise exception 'CHECK FAILED: %',label; end if;
 insert into dc_security_checks values(label);
end $$;
create function pg_temp.denied(command text,label text) returns void language plpgsql as $$
begin
 begin execute command;
 exception when insufficient_privilege or raise_exception then
   if sqlerrm like 'CHECK FAILED:%' then raise; end if;
   insert into dc_security_checks values(label); return;
 end;
 raise exception 'CHECK FAILED: unauthorized call succeeded: %',label;
end $$;
insert into auth.users(id,raw_app_meta_data,raw_user_meta_data)
 select a,'{}'::jsonb,'{}'::jsonb from dc_security_fixture union all select b,'{}'::jsonb,'{}'::jsonb from dc_security_fixture
 union all select c,'{}'::jsonb,'{}'::jsonb from dc_security_fixture;
insert into public.households(id,name,created_by)
 select home_a,'DC security regression A',a from dc_security_fixture
 union all select home_b,'DC security regression B',b from dc_security_fixture;
insert into public.household_members(household_id,user_id,role,status)
 select home_a,c,'guardian','active' from dc_security_fixture;
insert into public.child_profiles(id,household_id,display_name,created_by)
 select child_a,home_a,'Synthetic A',a from dc_security_fixture
 union all select child_b,home_b,'Synthetic B',b from dc_security_fixture;
select set_config('request.jwt.claim.sub',(select a::text from dc_security_fixture),true);
select set_config('request.jwt.claims','{}',true);

set local role authenticated;
select pg_temp.check(current_user='authenticated' and not (select rolbypassrls from pg_roles where rolname=current_user),'actual authenticated role enforces RLS');
select public.set_guardian_pin((select home_a from dc_security_fixture),'739251');
insert into dc_security_tokens select 'initial',public.create_guardian_unlock_session(home_a,'739251') from dc_security_fixture;
select pg_temp.check((select token ~ '^[0-9a-f]{64}$' from dc_security_tokens where label='initial'),'correct PIN returns token');
-- This is the pre-fix reproduction: the old RPC raises and loses its counter.
select pg_temp.check(public.create_guardian_unlock_session(home_a,'111111') is null,'wrong PIN returns controlled null denial') from dc_security_fixture;
reset role;
select pg_temp.check(failed_attempts=1 and locked_until is null,'first wrong attempt persists') from private.household_guardian_security where household_id=(select home_a from dc_security_fixture);
set local role authenticated;
do $$ declare h uuid:=(select home_a from dc_security_fixture); begin
 for i in 1..4 loop perform pg_temp.check(public.create_guardian_unlock_session(h,'111111') is null,'wrong attempt issues no token'); end loop;
end $$;
reset role;
select pg_temp.check(locked_until>clock_timestamp()+interval '14 minutes','fifth attempt persists fifteen-minute lockout') from private.household_guardian_security where household_id=(select home_a from dc_security_fixture);
create temp table dc_lock_before as select locked_until from private.household_guardian_security where household_id=(select home_a from dc_security_fixture);
set local role authenticated;
select pg_temp.check(public.create_guardian_unlock_session(home_a,'739251') is null,'correct PIN cannot bypass lockout') from dc_security_fixture;
select pg_temp.check(public.create_guardian_unlock_session(home_a,'111111') is null,'further wrong PIN denied during lockout') from dc_security_fixture;
reset role;
select pg_temp.check(locked_until=(select locked_until from dc_lock_before),'denials preserve cooldown') from private.household_guardian_security where household_id=(select home_a from dc_security_fixture);
select pg_temp.check((select count(*) from private.guardian_unlock_sessions where household_id=(select home_a from dc_security_fixture))=1,'failed attempts create no sessions');
update private.household_guardian_security set locked_until=clock_timestamp()-interval '1 second' where household_id=(select home_a from dc_security_fixture);
set local role authenticated;
insert into dc_security_tokens select 'fresh',public.create_guardian_unlock_session(home_a,'739251') from dc_security_fixture;
select pg_temp.check(private.guardian_unlock_session_valid(home_a,(select token from dc_security_tokens where label='fresh')),'expired cooldown allows correct PIN') from dc_security_fixture;
select pg_temp.check(not private.guardian_unlock_session_valid(home_a,(select token from dc_security_tokens where label='initial')),'new unlock revokes previous same-user token') from dc_security_fixture;
select pg_temp.check(not private.guardian_unlock_session_valid(home_b,(select token from dc_security_tokens where label='fresh')),'token cannot cross household') from dc_security_fixture;
select pg_temp.check(public.create_guardian_unlock_session(home_b,'739251') is null,'nonmember cannot unlock another home') from dc_security_fixture;
select pg_temp.check(public.create_guardian_unlock_session(gen_random_uuid(),'739251') is null,'unknown household denied');
reset role;
select pg_temp.check(failed_attempts=0 and locked_until is null,'successful unlock resets counter/cooldown') from private.household_guardian_security where household_id=(select home_a from dc_security_fixture);
select set_config('request.jwt.claim.sub',(select c::text from dc_security_fixture),true);
set local role authenticated;
select pg_temp.check(not private.guardian_unlock_session_valid(home_a,(select token from dc_security_tokens where label='fresh')),'token bound to issuing guardian even in same home') from dc_security_fixture;
select public.revoke_guardian_unlock_sessions(home_a) from dc_security_fixture;
reset role;
select set_config('request.jwt.claim.sub',(select a::text from dc_security_fixture),true);
set local role authenticated;
select pg_temp.check(private.guardian_unlock_session_valid(home_a,(select token from dc_security_tokens where label='fresh')),'different guardian cannot revoke issuing guardian session') from dc_security_fixture;
select pg_temp.denied(format('select public.revoke_guardian_unlock_sessions(%L::uuid)',home_b),'cannot revoke foreign household sessions') from dc_security_fixture;
reset role;
select set_config('request.jwt.claim.sub',(select c::text from dc_security_fixture),true);
update public.household_members set role='adult' where user_id=(select c from dc_security_fixture);
set local role authenticated;
select pg_temp.check(public.create_guardian_unlock_session(home_a,'739251') is null,'non-guardian adult cannot unlock') from dc_security_fixture;
select pg_temp.denied(format('select public.revoke_guardian_unlock_sessions(%L::uuid)',home_a),'non-guardian cannot revoke sessions') from dc_security_fixture;
reset role;
select set_config('request.jwt.claim.sub',(select a::text from dc_security_fixture),true);
update private.guardian_unlock_sessions set expires_at=clock_timestamp()-interval '1 second' where household_id=(select home_a from dc_security_fixture);
set local role authenticated;
select pg_temp.check(not private.guardian_unlock_session_valid(home_a,(select token from dc_security_tokens where label='fresh')),'expired token denied') from dc_security_fixture;
insert into dc_security_tokens select 'revoked',public.create_guardian_unlock_session(home_a,'739251') from dc_security_fixture;
select public.revoke_guardian_unlock_sessions(home_a) from dc_security_fixture;
select pg_temp.check(not private.guardian_unlock_session_valid(home_a,(select token from dc_security_tokens where label='revoked')),'revoked token denied') from dc_security_fixture;
select pg_temp.denied('select * from private.guardian_unlock_sessions','private session table remains inaccessible');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.denied(format('select public.create_guardian_unlock_session(%L::uuid,%L)',home_a,'739251'),'anonymous unlock denied') from dc_security_fixture;
select pg_temp.denied(format('select public.revoke_guardian_unlock_sessions(%L::uuid)',home_a),'anonymous revocation denied') from dc_security_fixture;
reset role;
select count(*) as checks_passed from dc_security_checks;
rollback;
