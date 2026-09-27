-- Test copied deployed export logic against temporary fixtures. No family data changes.
begin;
do $$
declare definition text; table_name text;
begin
  select pg_get_functiondef('private.privacy_export_payload_impl(uuid)'::regprocedure) into definition;
  for table_name in select distinct matches[1] from regexp_matches(definition,'(?:from|join) public\.([a-z_]+)','gi') as matches loop
    execute format('create temporary table %I as select * from public.%I with no data',table_name,table_name);
  end loop;
  execute replace(replace(definition,'private.','pg_temp.'),'public.','pg_temp.');
  select pg_get_functiondef('private.can_manage_household(uuid)'::regprocedure) into definition;
  execute replace(replace(definition,'private.','pg_temp.'),'public.','pg_temp.');
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='child_book_reading_positions'
    and cmd='SELECT' and qual='private.can_manage_child(child_profile_id)') then raise exception 'History policy must use guardian ownership'; end if;
  if not exists(select 1 from pg_constraint where conrelid='public.child_book_reading_positions'::regclass
    and confrelid='public.child_profiles'::regclass and confdeltype='c') then raise exception 'Child deletion must cascade bookmarks'; end if;
  if not exists(select 1 from pg_class where oid='public.child_data_inventory'::regclass and 'security_invoker=true'=any(reloptions)) then raise exception 'Inventory must honor RLS'; end if;
end;
$$;
do $$
declare actor uuid:=gen_random_uuid(); own_home uuid:=gen_random_uuid(); other_home uuid:=gen_random_uuid();
  child_a uuid:=gen_random_uuid(); child_b uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); request uuid:=gen_random_uuid(); result jsonb;
begin
  perform set_config('request.jwt.claim.sub',actor::text,true);
  insert into pg_temp.household_members(household_id,user_id,role,status) values(own_home,actor,'owner','active');
  insert into pg_temp.households(id,name) values(own_home,'Fixture household');
  insert into pg_temp.child_profiles(id,household_id,display_name,status) values(child_a,own_home,'A','active'),(child_b,own_home,'B','archived'),(stranger,other_home,'Other','active');
  insert into pg_temp.child_book_reading_positions(child_profile_id,book_id,revision,page_number,updated_at)
    values(child_a,gen_random_uuid(),'edition-a',3,now()),(child_b,gen_random_uuid(),'edition-b',9,now()),(stranger,gen_random_uuid(),'private',12,now());
  insert into pg_temp.data_privacy_requests(id,household_id,request_type,status) values(request,own_home,'export_household','requested');
  result:=pg_temp.privacy_export_payload_impl(request);
  if result->>'export_version'<>'2026.2' or jsonb_array_length(result->'book_reading_positions')<>2 then raise exception 'Household history incomplete'; end if;
  if exists(select 1 from jsonb_array_elements(result->'book_reading_positions') x where x->>'child_profile_id'=stranger::text) then raise exception 'Other household leaked'; end if;
  update pg_temp.data_privacy_requests set request_type='export_child',child_profile_id=child_a;
  result:=pg_temp.privacy_export_payload_impl(request);
  if jsonb_array_length(result->'book_reading_positions')<>1 or result#>>'{book_reading_positions,0,child_profile_id}'<>child_a::text then raise exception 'Child export scope failed'; end if;
  update pg_temp.data_privacy_requests set child_profile_id=child_b;
  result:=pg_temp.privacy_export_payload_impl(request);
  if result#>>'{book_reading_positions,0,page_number}'<>'9' then raise exception 'Archived child history lost'; end if;
  delete from pg_temp.child_book_reading_positions where child_profile_id=child_b;
  result:=pg_temp.privacy_export_payload_impl(request);
  if result->'book_reading_positions'<>'[]'::jsonb then raise exception 'Missing history must be an empty array'; end if;
  update pg_temp.household_members set status='removed';
  begin
    perform pg_temp.privacy_export_payload_impl(request);
    raise exception 'Removed guardian exported history';
  exception when raise_exception then
    if sqlerrm<>'Guardian household access required' then raise; end if;
  end;
end;
$$;
rollback;
