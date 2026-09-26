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

reset role;
select set_config('request.jwt.claim.sub','',true);
insert into public.challenges(id,title,slug,challenge_type,parent_approval_required)
 select challenge,'Synthetic guardian security check','dc-security-'||challenge,'other',true from dc_security_fixture;
-- Only synthetic catalog visibility; no approval records or real content change.
set local session_replication_role=replica;
update public.challenges set status='published' where id=(select challenge from dc_security_fixture);
set local session_replication_role=origin;
insert into public.child_challenge_progress(id,child_profile_id,challenge_id,status,submitted_at)
 select progress_a,child_a,challenge,'pending_parent',now() from dc_security_fixture
 union all select progress_b,child_b,challenge,'pending_parent',now() from dc_security_fixture;
select set_config('request.jwt.claim.sub',(select a::text from dc_security_fixture),true);
set local role authenticated;
select public.set_guardian_pin(home_a,'739251') from dc_security_fixture;
insert into dc_security_tokens select 'valid',public.create_guardian_unlock_session(home_a,'739251') from dc_security_fixture;

-- Both actual public invoker paths must work with the same valid session.
select public.return_parent_challenge(progress_a,(select token from dc_security_tokens where label='valid')) from dc_security_fixture;
select pg_temp.check(status='in_progress' and submitted_at is null,'valid guardian returns own pending challenge') from public.child_challenge_progress where id=(select progress_a from dc_security_fixture);
update public.child_challenge_progress set status='pending_parent',submitted_at=now() where id=(select progress_a from dc_security_fixture);
select public.approve_parent_challenge(progress_a,(select token from dc_security_tokens where label='valid')) from dc_security_fixture;
select pg_temp.check(status='completed' and approved_by=(select a from dc_security_fixture),'valid guardian approval records trusted caller') from public.child_challenge_progress where id=(select progress_a from dc_security_fixture);
-- Restore this synthetic progress for denial cases without progress-reversal triggers.
reset role;
set local session_replication_role=replica;
update public.child_challenge_progress set status='pending_parent',submitted_at=now(),approved_by=null,approved_at=null,completed_at=null where id=(select progress_a from dc_security_fixture);
set local session_replication_role=origin;
set local role authenticated;
do $$ declare f record; action text; begin
 select * into f from dc_security_fixture;
 foreach action in array array['approve_parent_challenge','return_parent_challenge'] loop
  perform pg_temp.denied(format('select public.%I(%L::uuid,%L)',action,f.progress_a,null),'missing session: '||action);
  perform pg_temp.denied(format('select public.%I(%L::uuid,%L)',action,f.progress_a,'bad-token'),'invalid session: '||action);
  perform pg_temp.denied(format('select public.%I(%L::uuid,%L)',action,f.progress_b,(select token from dc_security_tokens where label='valid')),'foreign child: '||action);
 end loop;
end $$;
reset role;
update private.guardian_unlock_sessions set expires_at=clock_timestamp()-interval '1 second' where household_id=(select home_a from dc_security_fixture);
set local role authenticated;
do $$ declare action text; begin foreach action in array array['approve_parent_challenge','return_parent_challenge'] loop
 perform pg_temp.denied(format('select public.%I(%L::uuid,%L)',action,(select progress_a from dc_security_fixture),(select token from dc_security_tokens where label='valid')),'expired session: '||action);
end loop; end $$;
insert into dc_security_tokens select 'revoked',public.create_guardian_unlock_session(home_a,'739251') from dc_security_fixture;
select public.revoke_guardian_unlock_sessions(home_a) from dc_security_fixture;
do $$ declare action text; begin foreach action in array array['approve_parent_challenge','return_parent_challenge'] loop
 perform pg_temp.denied(format('select public.%I(%L::uuid,%L)',action,(select progress_a from dc_security_fixture),(select token from dc_security_tokens where label='revoked')),'revoked session: '||action);
end loop; end $$;
insert into dc_security_tokens select 'new',public.create_guardian_unlock_session(home_a,'739251') from dc_security_fixture;
reset role;
select set_config('request.jwt.claim.sub',(select c::text from dc_security_fixture),true);
set local role authenticated;
do $$ declare action text; begin foreach action in array array['approve_parent_challenge','return_parent_challenge'] loop
 perform pg_temp.denied(format('select public.%I(%L::uuid,%L)',action,(select progress_a from dc_security_fixture),(select token from dc_security_tokens where label='new')),'same-home different guardian token denied: '||action);
end loop; end $$;
reset role;
update public.household_members set role='adult' where user_id=(select c from dc_security_fixture);
set local role authenticated;
do $$ declare action text; begin foreach action in array array['approve_parent_challenge','return_parent_challenge'] loop
 perform pg_temp.denied(format('select public.%I(%L::uuid,%L)',action,(select progress_a from dc_security_fixture),(select token from dc_security_tokens where label='new')),'non-guardian denied: '||action);
end loop; end $$;
reset role;
select set_config('request.jwt.claim.sub',(select b::text from dc_security_fixture),true);
set local role authenticated;
select public.set_guardian_pin(home_b,'839251') from dc_security_fixture;
insert into dc_security_tokens select 'other-home',public.create_guardian_unlock_session(home_b,'839251') from dc_security_fixture;
do $$ declare action text; begin foreach action in array array['approve_parent_challenge','return_parent_challenge'] loop
 perform pg_temp.denied(format('select public.%I(%L::uuid,%L)',action,(select progress_a from dc_security_fixture),(select token from dc_security_tokens where label='other-home')),'wrong-home guardian session denied: '||action);
end loop; end $$;
reset role;
select pg_temp.check((select count(*) from public.child_challenge_progress where id in(select progress_a from dc_security_fixture union all select progress_b from dc_security_fixture) and status='pending_parent' and approved_by is null)=2,'all denials preserve both pending targets');
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ declare action text; begin foreach action in array array['approve_parent_challenge','return_parent_challenge'] loop
 perform pg_temp.denied(format('select public.%I(%L::uuid,%L)',action,(select progress_a from dc_security_fixture),'bad-token'),'anonymous denied: '||action);
end loop; end $$;
reset role;
select count(*) as checks_passed from dc_security_checks;
rollback;
