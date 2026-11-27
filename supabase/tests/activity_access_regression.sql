-- Isolated authorization-logic fixtures, not a signed-in browser/RLS test.
begin;
do $$
begin
  if has_function_privilege('anon','private.can_record_child_activity(uuid,uuid)','EXECUTE') then
    raise exception 'Anonymous activity helper execution is exposed';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.child_content_progress'::regclass) then
    raise exception 'Activity progress RLS is disabled';
  end if;
  if (select count(*) from pg_policies where schemaname='public' and tablename='child_content_progress'
      and cmd in ('INSERT','UPDATE') and with_check like '%can_record_child_activity%')<>2 then
    raise exception 'Activity write policies do not enforce content access';
  end if;
end;
$$;
create temp table child_profiles(id uuid,household_id uuid,status text);
create temp table content_items(id uuid,status text,access_level text,available_from timestamptz,available_until timestamptz);
create temp table household_subscriptions(household_id uuid,plan_id uuid,status text,current_period_end timestamptz);
create temp table plan_entitlements(plan_id uuid,entitlement_key text);
create temp table household_entitlement_grants(household_id uuid,entitlement_key text,starts_at timestamptz,ends_at timestamptz);
create function pg_temp.can_manage_child(id uuid) returns boolean language sql as $$
 select id=current_setting('test.child')::uuid;
$$;
do $$
declare definition text;
begin
  select pg_get_functiondef('private.can_record_child_activity(uuid,uuid)'::regprocedure) into definition;
  definition:=replace(definition,'private.can_record_child_activity','pg_temp.can_record_child_activity');
  definition:=replace(definition,'private.can_manage_child','pg_temp.can_manage_child');
  definition:=replace(definition,'public.','pg_temp.');
  execute definition;
end;
$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$
declare child uuid:=gen_random_uuid(); household uuid:=gen_random_uuid(); content uuid:=gen_random_uuid(); plan uuid:=gen_random_uuid();
begin
  perform set_config('test.child',child::text,true);
  insert into pg_temp.child_profiles values(child,household,'active');
  insert into pg_temp.content_items values(content,'published','free',null,null);
  if not pg_temp.can_record_child_activity(child,content) then raise exception 'Free activity denied'; end if;
  if pg_temp.can_record_child_activity(gen_random_uuid(),content) then raise exception 'Other child allowed'; end if;
  update pg_temp.content_items set status='draft';
  if pg_temp.can_record_child_activity(child,content) then raise exception 'Draft activity allowed'; end if;
  update pg_temp.content_items set status='published',available_from=now()+interval '1 day';
  if pg_temp.can_record_child_activity(child,content) then raise exception 'Future activity allowed'; end if;
  update pg_temp.content_items set available_from=null,available_until=now();
  if pg_temp.can_record_child_activity(child,content) then raise exception 'Expired activity allowed'; end if;
  update pg_temp.content_items set available_until=null,access_level='member';
  if not pg_temp.can_record_child_activity(child,content) then raise exception 'Member activity denied'; end if;
  update pg_temp.content_items set access_level='premium';
  if pg_temp.can_record_child_activity(child,content) then raise exception 'Premium without access allowed'; end if;
  insert into pg_temp.plan_entitlements values(plan,'premium_content');
  insert into pg_temp.household_subscriptions values(gen_random_uuid(),plan,'active',null);
  if pg_temp.can_record_child_activity(child,content) then raise exception 'Other household subscription leaked'; end if;
  update pg_temp.household_subscriptions set household_id=household;
  if not pg_temp.can_record_child_activity(child,content) then raise exception 'Current premium denied'; end if;
  update pg_temp.household_subscriptions set current_period_end=now();
  if pg_temp.can_record_child_activity(child,content) then raise exception 'Expired subscription allowed'; end if;
  update pg_temp.household_subscriptions set current_period_end=null,status='canceled';
  if pg_temp.can_record_child_activity(child,content) then raise exception 'Canceled subscription allowed'; end if;
  insert into pg_temp.household_entitlement_grants values(household,'premium_content',now()-interval '1 day',null);
  if not pg_temp.can_record_child_activity(child,content) then raise exception 'Valid grant denied'; end if;
  update pg_temp.household_entitlement_grants set ends_at=now();
  if pg_temp.can_record_child_activity(child,content) then raise exception 'Expired grant allowed'; end if;
  update pg_temp.household_entitlement_grants set ends_at=null,starts_at=now()+interval '1 day';
  if pg_temp.can_record_child_activity(child,content) then raise exception 'Future grant allowed'; end if;
  update pg_temp.content_items set access_level='free';
  update pg_temp.child_profiles set status='archived';
  if pg_temp.can_record_child_activity(child,content) then raise exception 'Archived child allowed'; end if;
  update pg_temp.child_profiles set status='active';
  perform set_config('request.jwt.claim.sub','',true);
  if pg_temp.can_record_child_activity(child,content) then raise exception 'Unauthenticated activity allowed'; end if;
end;
$$;
rollback;
