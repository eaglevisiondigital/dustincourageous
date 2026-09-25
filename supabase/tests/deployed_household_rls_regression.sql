-- Run as the project database administrator in ONE transaction/session.
-- Uses actual deployed tables, policies, triggers and functions, not copies.
-- Synthetic auth rows have no email, password or issued session. Nothing commits.
-- This verifies database-role authorization, NOT Auth login or Storage HTTP.
begin;
set local statement_timeout = '30s';
create temporary table dc_rls_fixture as select
  gen_random_uuid() as user_a, gen_random_uuid() as user_b,
  gen_random_uuid() as home_a, gen_random_uuid() as home_b,
  gen_random_uuid() as child_a, gen_random_uuid() as child_b,
  gen_random_uuid() as notice_a, gen_random_uuid() as notice_b,
  gen_random_uuid() as ticket_a, gen_random_uuid() as ticket_b,
  (select id from public.books order by book_number limit 1) as book_id;
create temporary table dc_rls_results(check_name text primary key);
grant select on dc_rls_fixture to authenticated, anon;
grant select, insert on dc_rls_results to authenticated, anon;

do $$ begin
  if exists(select 1 from dc_rls_fixture where book_id is null) then
    raise exception 'An existing book is required as a read-only foreign-key reference';
  end if;
end $$;
insert into auth.users(id,raw_app_meta_data,raw_user_meta_data)
  select user_a,'{}'::jsonb,'{}'::jsonb from dc_rls_fixture
  union all select user_b,'{}'::jsonb,'{}'::jsonb from dc_rls_fixture;
insert into public.households(id,name,created_by)
  select home_a,'RLS transaction fixture A',user_a from dc_rls_fixture
  union all select home_b,'RLS transaction fixture B',user_b from dc_rls_fixture;
insert into public.child_profiles(id,household_id,display_name,created_by)
  select child_a,home_a,'Fixture A',user_a from dc_rls_fixture
  union all select child_b,home_b,'Fixture B',user_b from dc_rls_fixture;
insert into public.child_book_reading_positions(child_profile_id,book_id,revision,page_number)
  select child_a,book_id,'rls-fixture',2 from dc_rls_fixture
  union all select child_b,book_id,'rls-fixture',3 from dc_rls_fixture;
insert into public.user_notifications(id,user_id,household_id,notification_type,title,body)
  select notice_a,user_a,home_a,'system','RLS fixture A','Synthetic test only' from dc_rls_fixture
  union all select notice_b,user_b,home_b,'system','RLS fixture B','Synthetic test only' from dc_rls_fixture;
-- Explicit test numbers avoid advancing the real support ticket identity sequence.
insert into public.support_tickets(id,ticket_number,user_id,household_id,subject,message) overriding system value
  select ticket_a,-100000000001,user_a,home_a,'RLS fixture A','Synthetic test only' from dc_rls_fixture
  union all select ticket_b,-100000000002,user_b,home_b,'RLS fixture B','Synthetic test only' from dc_rls_fixture;
insert into public.household_entitlement_grants(household_id,entitlement_key,source_type)
  select home_b,'digital_books','manual' from dc_rls_fixture;

select set_config('request.jwt.claim.sub',(select user_a::text from dc_rls_fixture),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_a from dc_rls_fixture),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare f record; affected integer;
begin
  select * into f from dc_rls_fixture;
  if current_user <> 'authenticated' or (select rolbypassrls from pg_roles where rolname=current_user) then
    raise exception 'Tests must run with RLS enforced';
  end if;
  if auth.uid() is distinct from f.user_a then raise exception 'Fixture identity not active'; end if;
  insert into dc_rls_results values ('Authenticated role and JWT identity enforced');

  if (select count(*) from public.households where id in (f.home_a,f.home_b))<>1 or
     not exists(select 1 from public.households where id=f.home_a) then raise exception 'Household read isolation failed'; end if;
  if (select count(*) from public.child_profiles where id in (f.child_a,f.child_b))<>1 or
     not exists(select 1 from public.child_profiles where id=f.child_a) then raise exception 'Child read isolation failed'; end if;
  insert into dc_rls_results values ('Guardian sees own household and child, not another family');

  if (select count(*) from public.child_book_reading_positions where child_profile_id in (f.child_a,f.child_b))<>1 or
     not exists(select 1 from public.child_book_reading_positions where child_profile_id=f.child_a) then raise exception 'Reading history isolation failed'; end if;
  insert into dc_rls_results values ('Guardian reading history is household scoped');

  if (select count(*) from public.user_notifications where id in (f.notice_a,f.notice_b))<>1 or
     not exists(select 1 from public.user_notifications where id=f.notice_a) then raise exception 'Notification read isolation failed'; end if;
  update public.user_notifications set status='read',read_at=now() where id=f.notice_a;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Own notification read update failed'; end if;
  update public.user_notifications set status='read',read_at=now() where id=f.notice_b;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Another user notification changed'; end if;
  begin
    update public.user_notifications set user_id=f.user_b where id=f.notice_a;
    raise exception 'Notification ownership reassignment succeeded';
  exception when insufficient_privilege then null;
  end;
  insert into dc_rls_results values ('Notification read/write isolation and ownership checks enforced');

  if (select count(*) from public.support_tickets where id in (f.ticket_a,f.ticket_b))<>1 or
     not exists(select 1 from public.support_tickets where id=f.ticket_a) then raise exception 'Support ticket read isolation failed'; end if;
  insert into dc_rls_results values ('Support requests exclude another household');

  update public.child_profiles set display_name='Attempted cross-family edit' where id=f.child_b;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Another household child was edited'; end if;
  begin
    update public.child_profiles set household_id=f.home_b where id=f.child_a;
    raise exception 'Child moved to another household';
  exception when insufficient_privilege then null;
  end;
  insert into dc_rls_results values ('Child edits and household reassignment are protected');

  begin
    update public.child_book_reading_positions set page_number=10 where child_profile_id=f.child_a;
    raise exception 'Direct bookmark writes are permitted';
  exception when insufficient_privilege then null;
  end;
  insert into dc_rls_results values ('Direct bookmark writes denied; protected RPC required');

  if private.child_has_digital_book_access(f.child_a,f.book_id) or private.child_has_digital_book_access(f.child_b,f.book_id) then
    raise exception 'Another household digital entitlement leaked';
  end if;
  insert into dc_rls_results values ('Free household does not inherit another family digital access');
end $$;
reset role;

-- The same guardian belongs to two homes: paid access must stay with its child.
insert into public.household_members(household_id,user_id,role,status)
  select home_b,user_a,'guardian','active' from dc_rls_fixture;
set local role authenticated;
do $$ declare f record; begin
  select * into f from dc_rls_fixture;
  if private.child_has_digital_book_access(f.child_a,f.book_id) then raise exception 'Dual-household entitlement leaked to free child'; end if;
  if not private.child_has_digital_book_access(f.child_b,f.book_id) then raise exception 'Paid household child access missing'; end if;
  insert into dc_rls_results values ('Dual-household guardian digital access follows the selected child');
end $$;
reset role;

update public.household_entitlement_grants set ends_at=now()-interval '1 minute',starts_at=now()-interval '1 day'
  where household_id=(select home_b from dc_rls_fixture);
set local role authenticated;
do $$ declare f record; begin
  select * into f from dc_rls_fixture;
  if private.child_has_digital_book_access(f.child_b,f.book_id) then raise exception 'Expired digital entitlement allowed'; end if;
  insert into dc_rls_results values ('Expired digital entitlement denied');
end $$;
reset role;

update public.household_members set role='adult'
  where household_id=(select home_a from dc_rls_fixture) and user_id=(select user_a from dc_rls_fixture);
set local role authenticated;
do $$ declare f record; affected integer; begin
  select * into f from dc_rls_fixture;
  if private.can_manage_child(f.child_a) then raise exception 'Non-guardian adult can manage child'; end if;
  if exists(select 1 from public.child_book_reading_positions where child_profile_id=f.child_a) then raise exception 'Non-guardian adult reads bookmarks'; end if;
  update public.child_profiles set display_name='Adult attempted edit' where id=f.child_a;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Non-guardian adult edited child'; end if;
  insert into dc_rls_results values ('Non-guardian adult cannot manage child or read bookmarks');
end $$;
reset role;

update public.household_members set status='removed'
  where user_id=(select user_a from dc_rls_fixture);
set local role authenticated;
do $$ declare f record; begin
  select * into f from dc_rls_fixture;
  if exists(select 1 from public.households where id in (f.home_a,f.home_b)) or
     exists(select 1 from public.child_profiles where id in (f.child_a,f.child_b)) or
     exists(select 1 from public.child_book_reading_positions where child_profile_id in (f.child_a,f.child_b)) then
    raise exception 'Removed member retained household/child/bookmark access';
  end if;
  insert into dc_rls_results values ('Removing household membership revokes household/child/bookmark reads');
end $$;
reset role;

select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ declare leaked boolean; begin
  begin
    select exists(select 1 from public.child_profiles where id in (select child_a from dc_rls_fixture union all select child_b from dc_rls_fixture)) into leaked;
    if leaked then raise exception 'Anonymous child read allowed'; end if;
  exception when insufficient_privilege then null;
  end;
  if has_function_privilege('anon','public.get_digital_book(uuid,uuid)','EXECUTE') then raise exception 'Anonymous reader RPC allowed'; end if;
  insert into dc_rls_results values ('Anonymous child access and digital reader RPC denied');
end $$;
reset role;

select jsonb_build_object('checks_passed',count(*),'checks',jsonb_agg(check_name order by check_name),
  'mode','deployed tables and authenticated/anon roles; transaction rolled back') as authorization_evidence from dc_rls_results;
rollback;
