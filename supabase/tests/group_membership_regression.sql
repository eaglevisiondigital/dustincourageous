-- Isolated copies of deployed function logic. Guardian checks use fixtures.
-- This does not replace signed-in RLS or simultaneous multi-session tests.
begin;
-- Verify real deployed grants separately from the isolated function fixtures.
do $$
begin
  if has_table_privilege('authenticated','public.child_group_memberships','INSERT')
     or has_column_privilege('authenticated','public.child_group_memberships','group_id','UPDATE')
     or has_column_privilege('authenticated','public.child_group_memberships','child_profile_id','UPDATE')
     or has_column_privilege('authenticated','public.child_group_memberships','guardian_approved_by','UPDATE') then
    raise exception 'Direct membership approval writes are exposed';
  end if;
  if not has_column_privilege('authenticated','public.child_group_memberships','status','UPDATE')
     or not has_column_privilege('authenticated','public.child_group_memberships','ended_at','UPDATE') then
    raise exception 'Guardian withdrawal column privileges are missing';
  end if;
  if has_function_privilege('anon','public.join_child_to_group(text,uuid)','EXECUTE')
     or has_function_privilege('anon','private.join_child_to_group_impl(text,uuid)','EXECUTE') then
    raise exception 'Anonymous join execution is exposed';
  end if;
  if exists(select 1 from pg_proc where oid in ('public.join_child_to_group(text,uuid)'::regprocedure,'public.withdraw_child_from_group(uuid,uuid)'::regprocedure) and prosecdef) then
    raise exception 'Public group wrappers must be security invoker';
  end if;
end;
$$;
create temp table child_profiles(id uuid primary key,household_id uuid,status text);
create temp table organizations(id uuid primary key,status text);
create temp table adventure_groups(id uuid primary key,organization_id uuid,status text);
create temp table group_join_codes(id uuid primary key,group_id uuid,code_hash text,is_active boolean,expires_at timestamptz,max_uses integer,use_count integer);
create temp table child_group_memberships(group_id uuid,child_profile_id uuid,status text,guardian_approved_by uuid,guardian_approved_at timestamptz,joined_at timestamptz,ended_at timestamptz,unique(group_id,child_profile_id));
create temp table consent_policies(consent_key text,current_policy_version text,is_active boolean);
create temp table household_consents(household_id uuid,guardian_user_id uuid,child_profile_id uuid,consent_key text,action text,policy_version text,metadata jsonb);
create temp view current_household_consents as select * from household_consents;
create function pg_temp.can_manage_child(id uuid) returns boolean language sql as $$
 select exists(select 1 from pg_temp.child_profiles where child_profiles.id=$1 and household_id=current_setting('test.household')::uuid);
$$;
do $$
declare name text; definition text;
begin
  foreach name in array array['join_child_to_group_impl','withdraw_child_from_group'] loop
    select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=case when name='join_child_to_group_impl' then 'private' else 'public' end and p.proname=name;
    definition:=replace(definition,'private.'||name,'pg_temp.'||name);
    definition:=replace(definition,'public.','pg_temp.');
    definition:=replace(definition,'private.group_join_codes','pg_temp.group_join_codes');
    definition:=replace(definition,'private.can_manage_child','pg_temp.can_manage_child');
    execute definition;
  end loop;
end;
$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$
declare
  household uuid:=gen_random_uuid(); child uuid:=gen_random_uuid(); sibling uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid();
  org uuid:=gen_random_uuid(); grp uuid:=gen_random_uuid(); code_id uuid:=gen_random_uuid(); other_code uuid:=gen_random_uuid();
  approved_at timestamptz; ended timestamptz;
begin
  perform set_config('test.household',household::text,true);
  insert into pg_temp.child_profiles values(child,household,'active'),(sibling,household,'active'),(outsider,gen_random_uuid(),'active');
  insert into pg_temp.organizations values(org,'active');
  insert into pg_temp.adventure_groups values(grp,org,'active');
  insert into pg_temp.consent_policies values('group_participation','2026.1',true);
  insert into pg_temp.group_join_codes values(code_id,grp,encode(extensions.digest('FIRST','sha256'),'hex'),true,now()+interval '1 day',1,0),
    (other_code,grp,encode(extensions.digest('SECOND','sha256'),'hex'),true,now()+interval '1 day',10,0);
  if pg_temp.join_child_to_group_impl(' first ',child)<>grp then raise exception 'Join failed'; end if;
  select guardian_approved_at into approved_at from pg_temp.child_group_memberships where child_profile_id=child;
  perform pg_temp.join_child_to_group_impl('FIRST',child);
  perform pg_temp.join_child_to_group_impl('SECOND',child);
  if (select use_count from pg_temp.group_join_codes where id=code_id)<>1 or
     (select use_count from pg_temp.group_join_codes where id=other_code)<>0 then raise exception 'Repeat join consumed a use'; end if;
  if (select guardian_approved_at from pg_temp.child_group_memberships where child_profile_id=child) is distinct from approved_at then raise exception 'Approval changed on retry'; end if;
  if (select count(*) from pg_temp.household_consents)<>1 then raise exception 'Duplicate or missing consent'; end if;
  begin
    perform pg_temp.join_child_to_group_impl('FIRST',sibling);
    raise exception 'Full code allowed new member';
  exception when others then if sqlerrm<>'Join code is invalid, expired, or full' then raise; end if; end;
  begin
    perform pg_temp.join_child_to_group_impl('SECOND',outsider);
    raise exception 'Other household child joined';
  exception when others then if sqlerrm<>'Guardian access required' then raise; end if; end;
  begin
    perform pg_temp.withdraw_child_from_group(grp,outsider);
    raise exception 'Other household withdrawal allowed';
  exception when others then if sqlerrm<>'Guardian access required' then raise; end if; end;
  perform pg_temp.withdraw_child_from_group(grp,child);
  select ended_at into ended from pg_temp.child_group_memberships where child_profile_id=child;
  perform pg_temp.withdraw_child_from_group(grp,child);
  if ended is null or (select ended_at from pg_temp.child_group_memberships where child_profile_id=child) is distinct from ended then raise exception 'Repeat withdrawal changed history'; end if;
  perform pg_temp.join_child_to_group_impl('SECOND',child);
  if (select use_count from pg_temp.group_join_codes where id=other_code)<>1 then raise exception 'Rejoin did not consume exactly one use'; end if;
  if (select ended_at from pg_temp.child_group_memberships where child_profile_id=child) is not null then raise exception 'Rejoin retained end date'; end if;
  update pg_temp.consent_policies set is_active=false;
  begin
    perform pg_temp.join_child_to_group_impl('SECOND',sibling);
    raise exception 'Missing consent policy allowed join';
  exception when others then if sqlerrm<>'Group participation consent is unavailable' then raise; end if; end;
  update pg_temp.consent_policies set is_active=true;
  update pg_temp.child_profiles set status='archived' where id=sibling;
  begin
    perform pg_temp.join_child_to_group_impl('SECOND',sibling);
    raise exception 'Archived child joined';
  exception when others then if sqlerrm<>'Active child profile required' then raise; end if; end;
  update pg_temp.organizations set status='inactive';
  begin
    perform pg_temp.join_child_to_group_impl('SECOND',child);
    raise exception 'Inactive organization allowed join';
  exception when others then if sqlerrm<>'Group is not active' then raise; end if; end;
  update pg_temp.organizations set status='active';
  update pg_temp.group_join_codes set expires_at=now()-interval '1 day';
  begin
    perform pg_temp.join_child_to_group_impl('SECOND',child);
    raise exception 'Expired code allowed join';
  exception when others then if sqlerrm<>'Join code is invalid, expired, or full' then raise; end if; end;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform pg_temp.join_child_to_group_impl('SECOND',child);
    raise exception 'Unauthenticated join allowed';
  exception when others then if sqlerrm<>'Guardian access required' then raise; end if; end;
end;
$$;
rollback;
