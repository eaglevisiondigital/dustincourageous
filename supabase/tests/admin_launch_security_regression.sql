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
insert into public.app_admins(user_id,role,status) select a,'super_admin','active' from dc_security_fixture;
set local role authenticated;
create temp table dc_gate_actual as select * from public.admin_get_production_launch_gate();
select pg_temp.check((select count(*) from dc_gate_actual)>18,'admin receives full combined launch gate');
select pg_temp.check((select passed=false from dc_gate_actual where check_key='guardian_pin_coverage'),'missing synthetic household PIN remains blocker');
select pg_temp.check(not exists(select 1 from dc_gate_actual where passed is null),'gate has no unknown pass values');
select pg_temp.check((select count(*) from dc_gate_actual)=
 (select count(*) from private.admin_get_production_launch_gate_impl())+
 (select count(*) from private.admin_get_book_launch_gate_impl())+
 (select count(*) from private.admin_get_book_release_gate_impl())+
 (select count(*) from private.admin_get_membership_tier_gate_impl())+
 (select count(*) from private.admin_get_digital_book_launch_gate_impl()),'public result includes every component');
reset role;
do $$ declare r text; begin
 foreach r in array array['content_admin','operations_admin','support_admin','analyst'] loop
  update public.app_admins set role=r where user_id=(select a from dc_security_fixture);
  execute 'set local role authenticated';
  perform pg_temp.check((select count(*) from public.admin_get_production_launch_gate())=(select count(*) from dc_gate_actual),'established admin role can read: '||r);
  execute 'reset role';
 end loop;
end $$;
update public.app_admins set status='suspended' where user_id=(select a from dc_security_fixture);
set local role authenticated;
select pg_temp.denied('select * from public.admin_get_production_launch_gate()','suspended admin denied');
reset role;
select set_config('request.jwt.claim.sub',(select b::text from dc_security_fixture),true);
set local role authenticated;
select pg_temp.denied('select * from public.admin_get_production_launch_gate()','ordinary guardian denied');
select pg_temp.denied('select * from private.admin_get_production_launch_gate_impl()','direct guarded helper ordinary guardian denied');
select pg_temp.denied(format('insert into public.app_admins(user_id,role,status) values(%L::uuid,%L,%L)',b,'super_admin','active'),'client cannot create admin record') from dc_security_fixture;
reset role;
update auth.users set raw_user_meta_data='{"role":"super_admin","is_admin":true}'::jsonb where id=(select b from dc_security_fixture);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select b from dc_security_fixture),'role','authenticated','user_metadata',jsonb_build_object('role','super_admin','is_admin',true))::text,true);
set local role authenticated;
select pg_temp.denied('select * from public.admin_get_production_launch_gate()','editable metadata cannot create admin privilege');
reset role;
select pg_temp.check(not exists(select 1 from public.app_admins where user_id=(select b from dc_security_fixture)),'unauthorized admin mutation persisted nothing');
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role anon;
select pg_temp.denied('select * from public.admin_get_production_launch_gate()','anonymous admin RPC denied');
select pg_temp.denied('select * from private.admin_get_production_launch_gate_impl()','anonymous private gate denied');
reset role;
select count(*) as checks_passed from dc_security_checks;
rollback;
