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
insert into public.challenges(id,title,slug,challenge_type,xp_reward) select challenge,'Family participation fixture','family-test-'||challenge,'family',7 from dc_family_fixture;
insert into public.challenge_steps(id,challenge_id,title,is_required,sort_order) select step,challenge,'Required family step',true,1 from dc_family_fixture;
create temp table family_test_guides as select g.* from public.family_faith_guides g join dc_family_fixture f on f.guide=g.id;
create temp table family_test_challenges as select c.* from public.challenges c join dc_family_fixture f on f.challenge=c.id;
update family_test_guides set status='published';update family_test_challenges set status='published';
grant select on family_test_guides,family_test_challenges to authenticated;
-- The step catalog policy also follows the temporary published challenge source.
-- Child-progress ownership policies and completion/XP triggers are unchanged.
alter policy challenge_steps_read on public.challenge_steps using (
 exists(select 1 from pg_temp.family_test_challenges c where c.id=challenge_steps.challenge_id and c.status='published')
);
do $$ declare fn text; ns text; definition text; begin
 foreach fn in array array['complete_family_faith_participants','save_family_challenge_participants','child_can_access_challenge','user_can_access_challenge'] loop
  ns:=case when fn in ('complete_family_faith_participants','save_family_challenge_participants') then 'public' else 'private' end;
  select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=ns and p.proname=fn;
  definition:=replace(definition,'public.family_faith_guides','pg_temp.family_test_guides');
  definition:=replace(definition,'public.challenges','pg_temp.family_test_challenges');execute definition;
 end loop;
end $$;
select set_config('request.jwt.claim.sub',(select user_id::text from dc_family_fixture),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from dc_family_fixture),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare f record; n integer; begin
 select * into f from dc_family_fixture;
 if current_user <> 'authenticated' or (select rolbypassrls from pg_roles where rolname=current_user) then raise exception 'RLS required'; end if;
 begin
  perform public.complete_family_faith_participants(f.home,f.guide,array[f.a,f.other_child]);raise exception 'Cross-family batch accepted';
 exception when raise_exception then if sqlerrm<>'Every participant must be an active child in this household' then raise; end if; end;
 if exists(select 1 from public.household_faith_sessions where household_id=f.home) then raise exception 'Failed batch partially saved'; end if;
 insert into dc_family_results values ('Mixed-household Faith batch rejected without partial credit');
 select count(*) into n from public.complete_family_faith_participants(f.home,f.guide,array[f.a,f.b,f.a]);
 if n<>2 then raise exception 'Participant deduplication failed'; end if;
 perform public.complete_family_faith_participants(f.home,f.guide,array[f.a,f.b]);
 if (select count(*) from public.household_faith_sessions where household_id=f.home and family_faith_guide_id=f.guide)<>2 then raise exception 'Faith credit duplicated'; end if;
 if (select count(*) from public.child_activity_events where child_profile_id in(f.a,f.b) and source_id=f.guide)<>2 then raise exception 'Per-child Faith activity missing/duplicated'; end if;
 if exists(select 1 from public.household_faith_sessions where child_profile_id=f.unselected) then raise exception 'Unselected child credited'; end if;
 insert into dc_family_results values ('Faith saves one credit per selected child and retry is idempotent');
 begin
  perform public.save_family_challenge_participants(f.home,f.challenge,array[f.a,f.other_child],'participate');raise exception 'Cross-family challenge accepted';
 exception when raise_exception then if sqlerrm<>'Every participant must have access to this challenge in this household' then raise; end if; end;
 if exists(select 1 from public.child_challenge_progress where child_profile_id=f.a and challenge_id=f.challenge) then raise exception 'Challenge partial write'; end if;
 insert into dc_family_results values ('Mixed-household challenge batch rejected atomically');
 perform public.save_family_challenge_participants(f.home,f.challenge,array[f.a,f.b],'participate');
 if (select count(*) from public.child_challenge_progress where child_profile_id in(f.a,f.b) and status='in_progress')<>2 then raise exception 'Participation not saved'; end if;
 if exists(select 1 from public.xp_ledger where child_profile_id in(f.a,f.b)) then raise exception 'Participation awarded completion XP'; end if;
 insert into dc_family_results values ('Participation saves both children without completion XP');
 begin
  perform public.save_family_challenge_participants(f.home,f.challenge,array[f.a,f.b],'complete');raise exception 'Missing required steps accepted';
 exception when raise_exception then if sqlerrm<>'Confirm every required step for the selected children' then raise; end if; end;
 begin
  perform public.save_family_challenge_participants(f.home,f.challenge,array[f.a],'complete',array[gen_random_uuid()]);raise exception 'Foreign step accepted';
 exception when raise_exception then if sqlerrm<>'Invalid challenge step' then raise; end if; end;
 insert into dc_family_results values ('Required steps and step ownership enforced');
 perform public.save_family_challenge_participants(f.home,f.challenge,array[f.a,f.b],'complete',array[f.step]);
 perform public.save_family_challenge_participants(f.home,f.challenge,array[f.a,f.b],'complete',array[f.step]);
 perform public.save_family_challenge_participants(f.home,f.challenge,array[f.a,f.b],'participate');
 if (select count(*) from public.child_challenge_progress where child_profile_id in(f.a,f.b) and status='completed')<>2 then raise exception 'Completion regressed'; end if;
 if (select sum(points) from public.xp_ledger where child_profile_id in(f.a,f.b) and source_id=f.challenge)<>14 then raise exception 'Completion XP missing/duplicated'; end if;
 if exists(select 1 from public.child_challenge_progress where child_profile_id=f.unselected) then raise exception 'Unselected child progressed'; end if;
 insert into dc_family_results values ('Both completions award configured XP once and keep unselected children untouched');
end $$;
reset role;
-- Require approval for a new selected child without altering any real published content.
update family_test_challenges set parent_approval_required=true;
set local role authenticated;
do $$ declare f record; s text; begin
 select * into f from dc_family_fixture;
 select status into s from public.save_family_challenge_participants(f.home,f.challenge,array[f.unselected],'complete',array[f.step]);
 if s<>'pending_parent' then raise exception 'Guardian approval bypassed'; end if;
 if exists(select 1 from public.xp_ledger where child_profile_id=f.unselected) then raise exception 'Unapproved XP awarded'; end if;
 insert into dc_family_results values ('Guardian-required completion waits for PIN approval without XP');
 begin perform public.complete_family_faith_participants(f.home,f.guide,'{}');raise exception 'Empty participants accepted';
 exception when raise_exception then if sqlerrm<>'Choose participating children' then raise; end if; end;
 insert into dc_family_results values ('Empty selection rejected');
end $$;
reset role;
update public.child_profiles set status='archived' where id=(select b from dc_family_fixture);
set local role authenticated;
do $$ declare f record; begin
 select * into f from dc_family_fixture;
 begin perform public.complete_family_faith_participants(f.home,f.guide,array[f.b]);raise exception 'Archived child accepted';
 exception when raise_exception then if sqlerrm<>'Every participant must be an active child in this household' then raise; end if; end;
 insert into dc_family_results values ('Archived participants denied');
end $$;
reset role;
update public.household_members set role='adult' where household_id=(select home from dc_family_fixture);
set local role authenticated;
do $$ declare f record; begin
 select * into f from dc_family_fixture;
 begin perform public.complete_family_faith_participants(f.home,f.guide,array[f.a]);raise exception 'Non-guardian batch accepted';
 exception when raise_exception then if sqlerrm<>'Guardian household access required' then raise; end if; end;
 insert into dc_family_results values ('Non-guardian batch denied');
end $$;
reset role;
select check_name as passed from dc_family_results order by check_name;
rollback;
