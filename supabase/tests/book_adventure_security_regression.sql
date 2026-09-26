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
insert into public.books(id,title,slug,completion_xp,adventure_completion_xp)
 select book,'Synthetic security book','dc-security-'||book,0,7 from dc_security_fixture;
insert into public.challenges(id,title,slug,challenge_type,xp_reward)
 select challenge,'Synthetic book security step','dc-security-'||challenge,'other',0 from dc_security_fixture;
-- Set visibility on these uncommitted synthetic rows only. No content approval.
set local session_replication_role=replica;
update public.books set status='published' where id=(select book from dc_security_fixture);
update public.challenges set status='published' where id=(select challenge from dc_security_fixture);
set local session_replication_role=origin;
insert into public.household_book_access(household_id,book_id,source_type)
 select home_a,book,'manual' from dc_security_fixture union all select home_b,book,'manual' from dc_security_fixture;
insert into public.child_book_progress(child_profile_id,book_id,status,completed_at)
 select child_a,book,'completed',now() from dc_security_fixture;
insert into public.badges(id,badge_key,name) select badge,'dc-security-'||badge,'Synthetic XP badge' from dc_security_fixture;
insert into public.badge_rules(badge_id,rule_type,threshold_value) select badge,'xp_threshold',7 from dc_security_fixture;
insert into public.rewards(id,reward_key,name,reward_type) select reward,'dc-security-'||reward,'Synthetic adventure reward','digital' from dc_security_fixture;
insert into public.book_reward_rules(book_id,reward_id,milestone) select book,reward,'adventure_completed' from dc_security_fixture;
select set_config('request.jwt.claim.sub',(select a::text from dc_security_fixture),true);
set local role authenticated;

-- Pre-fix fails at the real raw XP helper, after readiness and RLS succeed.
select pg_temp.check(public.complete_child_book_adventure(child_a,book),'own household completion succeeds') from dc_security_fixture;
select pg_temp.check(public.complete_child_book_adventure(child_a,book),'repeat completion succeeds idempotently') from dc_security_fixture;
select private.award_completed_book_adventure(child_a,book) from dc_security_fixture;
select pg_temp.check((select count(*)=1 and sum(points)=7 from public.xp_ledger where child_profile_id=f.child_a and event_type='book_adventure_completed' and source_id=f.book),'exactly configured XP once') from dc_security_fixture f;
select pg_temp.check((select count(*)=1 from public.badge_awards where child_profile_id=f.child_a and badge_id=f.badge),'real XP threshold badge awarded once') from dc_security_fixture f;
select pg_temp.check((select count(*)=1 from public.reward_unlocks where child_profile_id=f.child_a and reward_id=f.reward),'milestone reward awarded once') from dc_security_fixture f;
select pg_temp.denied(format('select public.complete_child_book_adventure(%L::uuid,%L::uuid)',child_b,book),'foreign household child denied') from dc_security_fixture;
select pg_temp.denied(format('select private.award_completed_book_adventure(%L::uuid,%L::uuid)',child_b,book),'guarded helper foreign child denied') from dc_security_fixture;
select pg_temp.denied(format('select private.award_xp_event(%L::uuid,999,%L,%L,%L::uuid,%L)',child_a,'book_adventure_completed','book',book,'unauthorized'),'raw XP function unavailable') from dc_security_fixture;
select pg_temp.denied(format('select private.evaluate_child_badges(%L::uuid)',child_a),'raw badge function unavailable') from dc_security_fixture;
reset role;
-- A completed row cannot authorize privileged awards when a required step is missing.
select set_config('request.jwt.claim.sub','',true);
insert into public.book_challenges(book_id,challenge_id,is_required) select book,challenge,true from dc_security_fixture;
select set_config('request.jwt.claim.sub',(select a::text from dc_security_fixture),true);
set local role authenticated;
select pg_temp.denied(format('select public.complete_child_book_adventure(%L::uuid,%L::uuid)',child_a,book),'incomplete required challenge blocks completion') from dc_security_fixture;
select pg_temp.denied(format('select private.award_completed_book_adventure(%L::uuid,%L::uuid)',child_a,book),'guarded helper rechecks required steps') from dc_security_fixture;
reset role;
select set_config('request.jwt.claim.sub',(select b::text from dc_security_fixture),true);
set local role authenticated;
select pg_temp.denied(format('select private.award_completed_book_adventure(%L::uuid,%L::uuid)',child_b,book),'own child without completed progress cannot award') from dc_security_fixture;
reset role;
-- Same guardian in two homes must have access on the target child's household.
insert into public.household_members(household_id,user_id,role,status) select home_b,a,'guardian','active' from dc_security_fixture;
delete from public.household_book_access where household_id=(select home_b from dc_security_fixture);
select set_config('request.jwt.claim.sub',(select a::text from dc_security_fixture),true);
set local role authenticated;
select pg_temp.denied(format('select public.complete_child_book_adventure(%L::uuid,%L::uuid)',child_b,book),'another managed household entitlement cannot authorize this child') from dc_security_fixture;
reset role;
update public.household_members set role='adult' where user_id=(select c from dc_security_fixture);
select set_config('request.jwt.claim.sub',(select c::text from dc_security_fixture),true);
set local role authenticated;
select pg_temp.denied(format('select public.complete_child_book_adventure(%L::uuid,%L::uuid)',child_a,book),'non-guardian member denied') from dc_security_fixture;
select pg_temp.denied(format('select private.award_completed_book_adventure(%L::uuid,%L::uuid)',child_a,book),'guarded helper non-guardian denied') from dc_security_fixture;
reset role;
select pg_temp.check(not exists(select 1 from public.xp_ledger where child_profile_id=(select child_b from dc_security_fixture)),'foreign target has no XP');
select pg_temp.check((select count(*)=1 and sum(points)=7 from public.xp_ledger where child_profile_id=(select child_a from dc_security_fixture) and event_type='book_adventure_completed'),'denied calls add no XP');
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.denied(format('select public.complete_child_book_adventure(%L::uuid,%L::uuid)',child_a,book),'anonymous completion denied') from dc_security_fixture;
select pg_temp.denied(format('select private.award_completed_book_adventure(%L::uuid,%L::uuid)',child_a,book),'anonymous guarded helper denied') from dc_security_fixture;
reset role;
select count(*) as checks_passed from dc_security_checks;
rollback;
