-- Transaction-only integration fixture. Real household/group authorization and
-- registration writes; synthetic event publication uses temporary content copies.
-- No real content is published or approved. No Auth sessions are issued.
begin;
set local statement_timeout='30s';
create temp table dc_event_fixture as select gen_random_uuid() as user_id,
  gen_random_uuid() as home_a,gen_random_uuid() as home_b,
  gen_random_uuid() as child_a,gen_random_uuid() as sibling_a,gen_random_uuid() as child_b,
  gen_random_uuid() as org_id,gen_random_uuid() as group_a,gen_random_uuid() as group_b,
  gen_random_uuid() as group_event,gen_random_uuid() as org_event,gen_random_uuid() as open_event;
create temp table dc_event_results(check_name text);
grant select on dc_event_fixture to authenticated;
grant select,insert on dc_event_results to authenticated;
insert into auth.users(id,raw_app_meta_data,raw_user_meta_data) select user_id,'{}','{}' from dc_event_fixture;
insert into public.households(id,name,created_by)
 select home_a,'Event audience fixture A',user_id from dc_event_fixture
 union all select home_b,'Event audience fixture B',user_id from dc_event_fixture;
insert into public.child_profiles(id,household_id,display_name,created_by)
 select child_a,home_a,'Fixture A',user_id from dc_event_fixture
 union all select sibling_a,home_a,'Fixture sibling',user_id from dc_event_fixture
 union all select child_b,home_b,'Fixture B',user_id from dc_event_fixture;
insert into public.organizations(id,organization_key,name,organization_type,created_by)
 select org_id,'audience-'||org_id,'Event audience fixture','church',user_id from dc_event_fixture;
insert into public.adventure_groups(id,organization_id,group_key,name,created_by)
 select group_a,org_id,'audience-'||group_a,'Fixture group A',user_id from dc_event_fixture
 union all select group_b,org_id,'audience-'||group_b,'Fixture group B',user_id from dc_event_fixture;
insert into public.child_group_memberships(group_id,child_profile_id,guardian_approved_by)
 select group_a,child_a,user_id from dc_event_fixture
 union all select group_b,child_b,user_id from dc_event_fixture;
insert into public.events(id,event_key,title,starts_at,organization_id,group_id,created_by)
 select group_event,'audience-'||group_event,'Event audience fixture',now()+interval '1 day',org_id,group_b,user_id from dc_event_fixture
 union all select org_event,'audience-'||org_event,'Event audience fixture',now()+interval '1 day',org_id,null,user_id from dc_event_fixture
 union all select open_event,'audience-'||open_event,'Event audience fixture',now()+interval '1 day',null,null,user_id from dc_event_fixture;
create temp table audience_events as select e.* from public.events e join dc_event_fixture f on e.id in (f.group_event,f.org_event,f.open_event);
update audience_events set status='published';
-- Only the event-content source changes; all household/group checks remain real.
do $$ declare fn text; definition text; begin
 foreach fn in array array['can_view_event','register_for_event_impl','event_audience_allows_registration'] loop
  select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.proname=fn;
  if definition is not null then execute replace(definition,'public.events','pg_temp.audience_events'); end if;
 end loop;
end $$;
create function pg_temp.expect_audience_denied(e uuid,h uuid,c uuid) returns void language plpgsql as $$
begin
 perform private.register_for_event_impl(e,h,c);
 raise exception 'FAIL: event audience admitted an ineligible selection';
exception when raise_exception then
 if sqlerrm <> 'Event is not available for this family selection' then raise; end if;
end $$;
select set_config('request.jwt.claim.sub',(select user_id::text from dc_event_fixture),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from dc_event_fixture),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare f record; begin
 select * into f from dc_event_fixture;
 if current_user <> 'authenticated' or (select rolbypassrls from pg_roles where rolname=current_user) then raise exception 'RLS must be enforced'; end if;
 perform pg_temp.expect_audience_denied(f.group_event,f.home_a,f.child_a);
 perform pg_temp.expect_audience_denied(f.group_event,f.home_a,null);
 insert into dc_event_results values ('Group event does not borrow another household or sibling-group membership');
 if private.register_for_event_impl(f.group_event,f.home_b,f.child_b) <> 'registered' then raise exception 'Eligible child rejected'; end if;
 if private.register_for_event_impl(f.group_event,f.home_b,null) <> 'registered' then raise exception 'Eligible whole household rejected'; end if;
 insert into dc_event_results values ('Group child and whole-family registration allowed for qualifying household');
 perform pg_temp.expect_audience_denied(f.org_event,f.home_a,f.sibling_a);
 if private.register_for_event_impl(f.org_event,f.home_a,f.child_a) <> 'registered' then raise exception 'Organization child rejected'; end if;
 if private.register_for_event_impl(f.org_event,f.home_a,null) <> 'registered' then raise exception 'Organization household rejected'; end if;
 insert into dc_event_results values ('Organization events require the selected child to qualify');
 if private.register_for_event_impl(f.open_event,f.home_a,f.sibling_a) <> 'registered' then raise exception 'Open event blocked'; end if;
 insert into dc_event_results values ('Open events remain available without group membership');
end $$;
reset role;
-- A guardian's organization leadership is management access, not child membership.
insert into public.organization_members(organization_id,user_id,role) select org_id,user_id,'admin' from dc_event_fixture
 on conflict (organization_id,user_id) do update set role='admin',status='active';
set local role authenticated;
do $$ declare f record; begin
 select * into f from dc_event_fixture;
 perform pg_temp.expect_audience_denied(f.group_event,f.home_a,f.child_a);
 perform pg_temp.expect_audience_denied(f.org_event,f.home_a,f.sibling_a);
 insert into dc_event_results values ('Organization leadership does not bypass selected-child qualification');
end $$;
reset role;
update public.child_group_memberships set status='removed' where child_profile_id=(select child_b from dc_event_fixture);
set local role authenticated;
do $$ declare f record; begin
 select * into f from dc_event_fixture;
 perform pg_temp.expect_audience_denied(f.group_event,f.home_b,f.child_b);
 insert into dc_event_results values ('Removed group membership blocks registration retries');
end $$;
reset role;
update public.child_group_memberships set status='active' where child_profile_id=(select child_b from dc_event_fixture);
update public.adventure_groups set status='paused' where id=(select group_b from dc_event_fixture);
set local role authenticated;
do $$ declare f record; begin
 select * into f from dc_event_fixture;
 perform pg_temp.expect_audience_denied(f.group_event,f.home_b,f.child_b);
 insert into dc_event_results values ('Paused group blocks registration');
end $$;
reset role;
update public.adventure_groups set status='active' where id=(select group_b from dc_event_fixture);
update public.organizations set status='paused' where id=(select org_id from dc_event_fixture);
set local role authenticated;
do $$ declare f record; begin
 select * into f from dc_event_fixture;
 perform pg_temp.expect_audience_denied(f.group_event,f.home_b,f.child_b);
 perform pg_temp.expect_audience_denied(f.org_event,f.home_a,null);
 insert into dc_event_results values ('Paused organization blocks group and organization registrations');
end $$;
reset role;
select check_name as passed from dc_event_results order by check_name;
rollback;
