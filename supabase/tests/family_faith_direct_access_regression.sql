-- Atomic per-child progress through real authenticated RLS and triggers.
-- Only synthetic content publication uses temporary copies. All writes roll back.
begin;
set local statement_timeout='30s';
create temp table dc_family_fixture as select gen_random_uuid() as user_id,
 gen_random_uuid() as home,gen_random_uuid() as other_home,
 gen_random_uuid() as a,gen_random_uuid() as b,gen_random_uuid() as unselected,gen_random_uuid() as other_child,
 gen_random_uuid() as guide,gen_random_uuid() as challenge,gen_random_uuid() as step;
create temp table dc_family_results(check_name text);
grant select on dc_family_fixture to authenticated;
grant select,insert on dc_family_results to authenticated;
insert into auth.users(id,raw_app_meta_data,raw_user_meta_data) select user_id,'{}','{}' from dc_family_fixture;
insert into public.households(id,name,created_by) select home,'Family participation fixture',user_id from dc_family_fixture
 union all select other_home,'Family participation other fixture',user_id from dc_family_fixture;
insert into public.child_profiles(id,household_id,display_name,created_by)
 select a,home,'Participant A',user_id from dc_family_fixture union all select b,home,'Participant B',user_id from dc_family_fixture
 union all select unselected,home,'Not selected',user_id from dc_family_fixture union all select other_child,other_home,'Other household',user_id from dc_family_fixture;
insert into public.family_faith_guides(id,guide_key,title) select guide,'family-test-'||guide,'Family participation fixture' from dc_family_fixture;

-- Synthetic draft catalog copied only within this rolled-back test transaction.
create temp table family_access_guides as select g.* from public.family_faith_guides g join dc_family_fixture f on f.guide=g.id;
grant select on family_access_guides to authenticated;
do $$ declare definition text; begin
 select with_check into definition from pg_policies where schemaname='public' and tablename='household_faith_sessions' and policyname='household_faith_sessions_insert';
 definition:=replace(definition,'family_faith_guides','pg_temp.family_access_guides');
 execute 'alter policy household_faith_sessions_insert on public.household_faith_sessions with check ('||definition||')';
end $$;
select set_config('request.jwt.claim.sub',(select user_id::text from dc_family_fixture),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from dc_family_fixture),'role','authenticated')::text,true);
create function pg_temp.attempt_faith_credit(p_child uuid,p_user uuid) returns void language plpgsql security invoker as $$
begin
 insert into public.household_faith_sessions(household_id,family_faith_guide_id,child_profile_id,completed_by)
 select home,guide,p_child,p_user from dc_family_fixture;
end $$;
create function pg_temp.expect_faith_denied(label text,p_child uuid,p_user uuid) returns void language plpgsql security invoker as $$
begin
 begin
  perform pg_temp.attempt_faith_credit(p_child,p_user);
  raise exception 'Unauthorized Faith completion accepted: %',label;
 exception when insufficient_privilege then null;
 end;
 insert into dc_family_results values(label);
end $$;
set local role authenticated;
select pg_temp.expect_faith_denied('Draft guide denied',a,user_id) from dc_family_fixture;
reset role;
update family_access_guides set status='published',available_from=now()+interval '1 day';
set local role authenticated;
select pg_temp.expect_faith_denied('Future guide denied',a,user_id) from dc_family_fixture;
reset role;
update family_access_guides set available_from=null,available_until=now()-interval '1 day';
set local role authenticated;
select pg_temp.expect_faith_denied('Expired guide denied',a,user_id) from dc_family_fixture;
reset role;
update family_access_guides set available_until=null,access_level='premium';
set local role authenticated;
select pg_temp.expect_faith_denied('Premium guide without household entitlement denied',a,user_id) from dc_family_fixture;
select pg_temp.expect_faith_denied('Household-only premium bypass denied',null,user_id) from dc_family_fixture;
reset role;
update family_access_guides set access_level='free';
update public.child_profiles set status='archived' where id=(select a from dc_family_fixture);
set local role authenticated;
select pg_temp.expect_faith_denied('Archived participant denied',a,user_id) from dc_family_fixture;
select pg_temp.expect_faith_denied('Wrong-household child denied',other_child,user_id) from dc_family_fixture;
select pg_temp.expect_faith_denied('Forged completed-by identity denied',b,gen_random_uuid()) from dc_family_fixture;
select pg_temp.attempt_faith_credit(b,user_id) from dc_family_fixture;
do $$ declare f record; begin
 select * into f from dc_family_fixture;
 if (select count(*) from public.household_faith_sessions where household_id=f.home)<>1 then raise exception 'Expected one valid completion'; end if;
 if (select count(*) from public.child_activity_events where child_profile_id=f.b and source_id=f.guide)<>1 then raise exception 'Valid child activity missing'; end if;
 insert into dc_family_results values('Accessible free guide saves one valid child activity');
end $$;
reset role;
select * from dc_family_results;
rollback;
