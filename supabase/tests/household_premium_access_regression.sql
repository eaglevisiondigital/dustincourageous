-- One administrator session. Actual deployed identity/household/access functions.
-- No issued Auth sessions, no content publication, and no lasting fixture data.
begin;
set local statement_timeout = '30s';
create temporary table dc_premium_fixture as select
  gen_random_uuid() as user_id, gen_random_uuid() as home_a,
  gen_random_uuid() as home_b, gen_random_uuid() as child_a,
  gen_random_uuid() as child_b, gen_random_uuid() as challenge_id,
  gen_random_uuid() as adventure_id, gen_random_uuid() as reward_id, gen_random_uuid() as event_id,
  (select id from public.books order by book_number limit 1) as book_id;
grant select on dc_premium_fixture to authenticated;
create temporary table dc_premium_results(check_name text);
grant select,insert on dc_premium_results to authenticated;
insert into auth.users(id,raw_app_meta_data,raw_user_meta_data)
  select user_id,'{}'::jsonb,'{}'::jsonb from dc_premium_fixture;
insert into public.households(id,name,created_by)
  select home_a,'Premium isolation fixture A',user_id from dc_premium_fixture
  union all select home_b,'Premium isolation fixture B',user_id from dc_premium_fixture;
insert into public.child_profiles(id,household_id,display_name,created_by)
  select child_a,home_a,'Fixture A',user_id from dc_premium_fixture
  union all select child_b,home_b,'Fixture B',user_id from dc_premium_fixture;
-- Remove automatic free-plan access only for these transaction-local fixtures.
delete from public.household_subscriptions where household_id in
  (select home_a from dc_premium_fixture union all select home_b from dc_premium_fixture);
delete from public.household_entitlement_grants where household_id in
  (select home_a from dc_premium_fixture union all select home_b from dc_premium_fixture);
insert into public.household_entitlement_grants(household_id,entitlement_key,source_type)
  select home_b,k,'manual' from dc_premium_fixture
  cross join unnest(array['book_companions','full_challenge_library','rewards_redemption','premium_content']) k;
insert into public.challenges(id,title,slug,challenge_type,access_level,xp_reward)
  select challenge_id,'Isolation fixture','isolation-'||challenge_id,'other','premium',1 from dc_premium_fixture;
insert into public.adventures(id,title,slug,access_level,completion_xp)
  select adventure_id,'Isolation fixture','isolation-'||adventure_id,'premium',1 from dc_premium_fixture;
insert into public.rewards(id,reward_key,name,reward_type,xp_required,access_level)
  select reward_id,'isolation-'||reward_id,'Isolation fixture','digital',1,'premium' from dc_premium_fixture;
insert into public.events(id,event_key,title,starts_at,created_by,access_level)
  select event_id,'isolation-'||event_id,'Isolation fixture',now()+interval '1 day',user_id,'premium' from dc_premium_fixture;
select set_config('request.jwt.claim.sub',(select user_id::text from dc_premium_fixture),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from dc_premium_fixture),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare f record; denied boolean := false; begin
  select * into f from dc_premium_fixture;
  if current_user <> 'authenticated' or (select rolbypassrls from pg_roles where rolname=current_user) then
    raise exception 'RLS must be enforced';
  end if;
  begin
    insert into public.child_book_progress(child_profile_id,book_id,status)
      values(f.child_a,f.book_id,'available');
  exception when raise_exception then
    if sqlerrm <> 'Book companion access required' then raise; end if;
    denied := true;
  end;
  if not denied then raise exception 'FAIL: household B companion access leaked to household A'; end if;
  insert into public.child_book_progress(child_profile_id,book_id,status)
    values(f.child_b,f.book_id,'available');
  insert into dc_premium_results values ('Companion writes: free household denied, entitled household allowed');
  denied:=false;
  begin
    update public.child_book_progress set child_profile_id=f.child_a where child_profile_id=f.child_b;
  exception when raise_exception then
    if sqlerrm <> 'Book companion access required' then raise; end if;
    denied:=true;
  end;
  if not denied then raise exception 'Progress reassignment bypassed companion access'; end if;
  insert into dc_premium_results values ('Progress reassignment rechecks the target child');
  if private.child_can_access_challenge(f.child_b,f.challenge_id) or private.child_can_access_adventure(f.child_b,f.adventure_id) then
    raise exception 'Draft content was accessible';
  end if;
  begin
    insert into public.child_adventure_progress(child_profile_id,adventure_id,status) values(f.child_b,f.adventure_id,'completed');
    raise exception 'Draft adventure completion allowed';
  exception when raise_exception then
    if sqlerrm <> 'Adventure access required' then raise; end if;
  end;
  insert into dc_premium_results values ('Draft challenge/adventure denied, including direct adventure completion');
  if private.household_has_active_entitlement(f.home_a,'rewards_redemption')
     or not private.household_has_active_entitlement(f.home_b,'rewards_redemption') then raise exception 'Reward entitlement household leak'; end if;
end $$;
reset role;

-- Content-only seam: use copies of synthetic drafts as published fixtures.
-- No real content is published or approved. Identity, memberships, entitlements,
-- progress tables, triggers, XP and reward writes below are the deployed paths.
create temporary table premium_challenges as select c.* from public.challenges c join dc_premium_fixture f on f.challenge_id=c.id;
create temporary table premium_adventures as select a.* from public.adventures a join dc_premium_fixture f on f.adventure_id=a.id;
create temporary table premium_events as select e.* from public.events e join dc_premium_fixture f on f.event_id=e.id;
update premium_challenges set status='published';
update premium_adventures set status='published';
update premium_events set status='published';
do $$ declare fn text; definition text; begin
  foreach fn in array array['child_can_access_challenge','child_can_access_adventure','can_view_event','register_for_event_impl','event_audience_allows_registration'] loop
    select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='private' and p.proname=fn;
    definition:=replace(definition,'public.challenges','pg_temp.premium_challenges');
    definition:=replace(definition,'public.adventures','pg_temp.premium_adventures');
    definition:=replace(definition,'public.events','pg_temp.premium_events');
    execute definition;
  end loop;
end $$;
set local role authenticated;
do $$ declare f record; result text; begin
  select * into f from dc_premium_fixture;
  if private.child_can_access_challenge(f.child_a,f.challenge_id)
     or private.child_can_access_adventure(f.child_a,f.adventure_id)
     or not private.child_can_access_challenge(f.child_b,f.challenge_id)
     or not private.child_can_access_adventure(f.child_b,f.adventure_id) then raise exception 'Paid content household isolation failed'; end if;
  begin
    insert into public.child_challenge_progress(child_profile_id,challenge_id,status) values(f.child_a,f.challenge_id,'completed');
    raise exception 'Free household completed premium challenge';
  exception when raise_exception then if sqlerrm <> 'Challenge access required' then raise; end if; end;
  begin
    insert into public.child_adventure_progress(child_profile_id,adventure_id,status) values(f.child_a,f.adventure_id,'completed');
    raise exception 'Free household completed premium adventure';
  exception when raise_exception then if sqlerrm <> 'Adventure access required' then raise; end if; end;
  insert into public.child_challenge_progress(child_profile_id,challenge_id,status) values(f.child_b,f.challenge_id,'completed');
  insert into public.child_adventure_progress(child_profile_id,adventure_id,status) values(f.child_b,f.adventure_id,'completed');
  if not exists(select 1 from public.reward_unlocks where child_profile_id=f.child_b and reward_id=f.reward_id) then raise exception 'Entitled child did not unlock reward'; end if;
  insert into dc_premium_results values ('Premium challenge/adventure writes and reward unlock allowed only for entitled child');
  begin
    perform private.register_for_event_impl(f.event_id,f.home_a,null);
    raise exception 'Other household premium event access leaked';
  exception when raise_exception then if sqlerrm <> 'This household requires premium event access' then raise; end if; end;
  result:=private.register_for_event_impl(f.event_id,f.home_b,f.child_b);
  if result <> 'registered' then raise exception 'Entitled family event registration failed'; end if;
  insert into dc_premium_results values ('Premium event registration uses the selected household');
end $$;
reset role;
-- Free activities must work without leaking the other family's premium rewards.
update premium_challenges set access_level='free';
update premium_adventures set access_level='free';
set local role authenticated;
do $$ declare f record; begin
  select * into f from dc_premium_fixture;
  insert into public.child_challenge_progress(child_profile_id,challenge_id,status) values(f.child_a,f.challenge_id,'completed');
  insert into public.child_adventure_progress(child_profile_id,adventure_id,status) values(f.child_a,f.adventure_id,'completed');
  if exists(select 1 from public.reward_unlocks where child_profile_id=f.child_a and reward_id=f.reward_id) then raise exception 'Other household premium reward leaked'; end if;
  if (select sum(points) from public.xp_ledger where child_profile_id=f.child_a) <> 2 then raise exception 'Free progress did not award expected XP'; end if;
  insert into dc_premium_results values ('Free activities retain XP without borrowing premium rewards');
end $$;
reset role;
update public.household_entitlement_grants set ends_at=now()-interval '1 hour',starts_at=now()-interval '1 day'
 where household_id=(select home_b from dc_premium_fixture);
set local role authenticated;
do $$ declare f record; begin
  select * into f from dc_premium_fixture;
  if private.household_has_active_entitlement(f.home_b,'premium_content') or private.child_has_book_companion_access(f.child_b,f.book_id) then raise exception 'Expired grant allowed'; end if;
  insert into dc_premium_results values ('Expired grants denied');
end $$;
reset role;
update public.household_entitlement_grants set starts_at=now()+interval '1 day',ends_at=null
 where household_id=(select home_b from dc_premium_fixture);
set local role authenticated;
do $$ declare f record; begin
  select * into f from dc_premium_fixture;
  if private.household_has_active_entitlement(f.home_b,'premium_content') then raise exception 'Future grant allowed'; end if;
  insert into dc_premium_results values ('Future grants denied');
end $$;
reset role;
update public.household_entitlement_grants set starts_at=now()-interval '1 day'
 where household_id=(select home_b from dc_premium_fixture);
update public.household_members set role='adult' where household_id=(select home_b from dc_premium_fixture);
set local role authenticated;
do $$ declare f record; begin
  select * into f from dc_premium_fixture;
  if private.household_has_active_entitlement(f.home_b,'premium_content') or private.child_has_book_companion_access(f.child_b,f.book_id) then raise exception 'Non-guardian access allowed'; end if;
  insert into dc_premium_results values ('Non-guardian adult denied');
end $$;
reset role;
update public.household_members set role='parent',status='removed' where household_id=(select home_b from dc_premium_fixture);
set local role authenticated;
do $$ declare f record; begin
  select * into f from dc_premium_fixture;
  if private.household_has_active_entitlement(f.home_b,'premium_content') then raise exception 'Removed guardian allowed'; end if;
  insert into dc_premium_results values ('Removed guardian denied');
end $$;
reset role;
select check_name as passed from dc_premium_results order by check_name;
rollback;
