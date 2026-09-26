-- Isolated fixtures use copies of deployed function bodies and real auth.uid claims.
-- No production family, book, approval, entitlement or storage records are changed.
-- Catalog assertions check deployed grants/RLS. This is not an HTTP Storage or signed-in device test.
begin;
do $$
declare fn text;
begin
  foreach fn in array array['get_digital_book(uuid,uuid)','save_digital_book_position(uuid,uuid,text,integer)',
    'admin_prepare_digital_book(uuid,jsonb)','admin_get_digital_book(uuid)'] loop
    if has_function_privilege('anon','public.'||fn,'EXECUTE') then raise exception 'Anonymous execution exposed: %',fn; end if;
    if (select prosecdef from pg_proc where oid=('public.'||fn)::regprocedure) then raise exception 'Public wrapper elevates: %',fn; end if;
  end loop;
  if has_table_privilege('authenticated','private.digital_book_manifests','SELECT') then raise exception 'Private page text exposed'; end if;
  if has_table_privilege('authenticated','public.child_book_reading_positions','INSERT,UPDATE,DELETE') then raise exception 'Direct reading-position writes exposed'; end if;
  if not (select relrowsecurity from pg_class where oid='public.child_book_reading_positions'::regclass) then raise exception 'Position RLS missing'; end if;
  if (select public from storage.buckets where id='dc-digital-books') is distinct from false then raise exception 'Digital bucket must be private'; end if;
  if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and cmd in ('UPDATE','DELETE','ALL')
    and (coalesce(qual,'')||coalesce(with_check,'')) like '%dc-digital-books%') then raise exception 'Digital objects are mutable through a client policy'; end if;
end;
$$;
create temp table books(id uuid primary key,title text,status text,release_date date,metadata jsonb);
create temp table child_profiles(id uuid primary key,household_id uuid,status text);
create temp table household_members(household_id uuid,user_id uuid,status text,role text);
create temp table household_subscriptions(household_id uuid,plan_id uuid,status text,current_period_end timestamptz);
create temp table plan_entitlements(plan_id uuid,entitlement_key text);
create temp table household_entitlement_grants(household_id uuid,entitlement_key text,starts_at timestamptz,ends_at timestamptz);
create temp table household_book_access(household_id uuid,book_id uuid,starts_at timestamptz,ends_at timestamptz);
create temp table digital_book_manifests(book_id uuid primary key,manifest jsonb,updated_at timestamptz default now());
create temp table dc_content_reviews(entity_type text,entity_id uuid,status text,content_fingerprint text);
create temp table child_book_reading_positions(child_profile_id uuid,book_id uuid,revision text,page_number integer,updated_at timestamptz default now(),primary key(child_profile_id,book_id));
create temp table app_admins(user_id uuid,status text,role text);
create temp table objects(bucket_id text,name text);
do $$
declare fn text; definition text;
begin
  foreach fn in array array['can_manage_child(uuid)','is_content_admin()','dc_entity_payload(text,uuid)',
    'dc_entity_fingerprint(text,uuid)','digital_book_manifest_valid(uuid,jsonb)','digital_book_released(uuid)',
    'child_has_digital_book_access(uuid,uuid)','digital_book_object_readable(text)',
    'get_digital_book_impl(uuid,uuid)','save_digital_book_position_impl(uuid,uuid,text,integer)',
    'admin_prepare_digital_book_impl(uuid,jsonb)','admin_get_digital_book_impl(uuid)'] loop
    select pg_get_functiondef(('private.'||fn)::regprocedure) into definition;
    execute replace(replace(replace(definition,'private.','pg_temp.'),'public.','pg_temp.'),'storage.objects','pg_temp.objects');
  end loop;
end;
$$;
do $$
declare
  actor uuid:=gen_random_uuid(); home_a uuid:=gen_random_uuid(); home_b uuid:=gen_random_uuid();
  child_a uuid:=gen_random_uuid(); child_b uuid:=gen_random_uuid(); book uuid:=gen_random_uuid(); plan uuid:=gen_random_uuid();
  manifest jsonb; reference jsonb; result jsonb;
begin
  perform set_config('request.jwt.claim.sub',actor::text,true);
  insert into pg_temp.household_members values(home_a,actor,'active','owner'),(home_b,actor,'active','guardian');
  insert into pg_temp.child_profiles values(child_a,home_a,'active'),(child_b,home_b,'active');
  insert into pg_temp.plan_entitlements values(plan,'book_companions');
  insert into pg_temp.household_subscriptions values(home_a,plan,'active',null);
  if pg_temp.child_has_digital_book_access(child_a,book) then raise exception 'Free companion unlocked full book'; end if;
  update pg_temp.plan_entitlements set entitlement_key='digital_books';
  update pg_temp.household_subscriptions set household_id=home_b;
  if pg_temp.child_has_digital_book_access(child_a,book) then raise exception 'Other household membership leaked'; end if;
  if not pg_temp.child_has_digital_book_access(child_b,book) then raise exception 'Active digital membership denied'; end if;
  update pg_temp.household_subscriptions set current_period_end=now();
  if pg_temp.child_has_digital_book_access(child_b,book) then raise exception 'Expired subscription allowed'; end if;
  update pg_temp.household_subscriptions set current_period_end=null,status='canceled';
  if pg_temp.child_has_digital_book_access(child_b,book) then raise exception 'Canceled subscription allowed'; end if;
  insert into pg_temp.household_entitlement_grants values(home_a,'digital_books',now()+interval '1 day',null);
  if pg_temp.child_has_digital_book_access(child_a,book) then raise exception 'Future grant allowed'; end if;
  update pg_temp.household_entitlement_grants set starts_at=now()-interval '1 day',ends_at=now();
  if pg_temp.child_has_digital_book_access(child_a,book) then raise exception 'Expired grant allowed'; end if;
  update pg_temp.household_entitlement_grants set ends_at=null;
  if not pg_temp.child_has_digital_book_access(child_a,book) then raise exception 'Active grant denied'; end if;
  delete from pg_temp.household_entitlement_grants;
  insert into pg_temp.household_book_access values(home_a,book,now()-interval '1 day',null);
  if not pg_temp.child_has_digital_book_access(child_a,book) then raise exception 'Individual book access denied'; end if;
  if pg_temp.child_has_digital_book_access(child_a,gen_random_uuid()) then raise exception 'Individual grant unlocked another book'; end if;
  update pg_temp.child_profiles set status='archived' where id=child_a;
  if pg_temp.child_has_digital_book_access(child_a,book) then raise exception 'Archived child allowed'; end if;
  update pg_temp.child_profiles set status='active';
  update pg_temp.household_members set role='adult' where household_id=home_a;
  if pg_temp.child_has_digital_book_access(child_a,book) then raise exception 'Non-guardian allowed'; end if;
  update pg_temp.household_members set role='owner';

  manifest:=jsonb_build_object('revision','edition-1','pages',jsonb_build_array(
    jsonb_build_object('path',book::text||'/edition-1/001.png','alt','First page'),
    jsonb_build_object('path',book::text||'/edition-1/002.png','alt','Second page')));
  if not pg_temp.digital_book_manifest_valid(book,manifest) then raise exception 'Valid manifest denied'; end if;
  if pg_temp.digital_book_manifest_valid(book,jsonb_set(manifest,'{pages,0,path}',to_jsonb('https://example.invalid/page.png'::text))) then raise exception 'External image path allowed'; end if;
  if pg_temp.digital_book_manifest_valid(book,jsonb_set(manifest,'{pages,1,path}',manifest#>'{pages,0,path}')) then raise exception 'Duplicate page allowed'; end if;
  insert into pg_temp.books values(book,'Fixture book','draft',null,'{}');
  insert into pg_temp.objects select 'dc-digital-books',value->>'path' from jsonb_array_elements(manifest->'pages');
  begin perform pg_temp.admin_prepare_digital_book_impl(book,manifest); raise exception 'Non-admin prepared book'; exception when insufficient_privilege then null; end;
  insert into pg_temp.app_admins values(actor,'active','content_admin');
  perform pg_temp.admin_prepare_digital_book_impl(book,manifest);
  if (select metadata->'digital_reader' ? 'pages' from pg_temp.books where id=book) then raise exception 'Catalog exposes page text'; end if;
  if pg_temp.admin_get_digital_book_impl(book)<>manifest then raise exception 'Admin review lost prepared pages'; end if;
  if pg_temp.digital_book_released(book) then raise exception 'Draft released'; end if;
  update pg_temp.books set status='published';
  if pg_temp.digital_book_released(book) then raise exception 'Unapproved book released'; end if;
  insert into pg_temp.dc_content_reviews values('book',book,'approved',pg_temp.dc_entity_fingerprint('book',book));
  if not pg_temp.digital_book_released(book) then raise exception 'Approved release denied'; end if;
  perform pg_temp.admin_prepare_digital_book_impl(book,manifest);
  if (select status from pg_temp.books where id=book)<>'published' then raise exception 'Identical preparation retry demoted book'; end if;
  update pg_temp.books set release_date=current_date+1;
  update pg_temp.dc_content_reviews set content_fingerprint=pg_temp.dc_entity_fingerprint('book',book);
  if pg_temp.digital_book_released(book) then raise exception 'Future release allowed'; end if;
  update pg_temp.books set release_date=null;
  if pg_temp.digital_book_released(book) then raise exception 'Stale approval accepted'; end if;
  update pg_temp.dc_content_reviews set content_fingerprint=pg_temp.dc_entity_fingerprint('book',book);
  if not pg_temp.digital_book_object_readable(book::text||'/edition-1/001.png') then raise exception 'Approved page denied'; end if;
  if pg_temp.digital_book_object_readable(book::text||'/edition-1/unlisted.png') then raise exception 'Unlisted file exposed'; end if;
  result:=pg_temp.get_digital_book_impl(child_b,book);
  if result<>jsonb_build_object('availability','locked') then raise exception 'Locked child received content'; end if;
  begin perform pg_temp.get_digital_book_impl(gen_random_uuid(),book); raise exception 'Unrelated child allowed'; exception when insufficient_privilege then null; end;
  begin perform pg_temp.save_digital_book_position_impl(child_a,book,'edition-1',3); raise exception 'Invalid page saved'; exception when invalid_parameter_value then null; end;
  begin perform pg_temp.save_digital_book_position_impl(child_a,book,'old-edition',1); raise exception 'Stale edition saved'; exception when invalid_parameter_value then null; end;
  perform pg_temp.save_digital_book_position_impl(child_a,book,'edition-1',2);
  if (pg_temp.get_digital_book_impl(child_a,book)->>'page_number')::integer<>2 then raise exception 'Saved position lost'; end if;
  update pg_temp.household_book_access set ends_at=now();
  begin perform pg_temp.save_digital_book_position_impl(child_a,book,'edition-1',1); raise exception 'Expired access saved'; exception when insufficient_privilege then null; end;
  update pg_temp.household_book_access set ends_at=null;
  manifest:=replace(manifest::text,'edition-1','edition-2')::jsonb;
  insert into pg_temp.objects select 'dc-digital-books',value->>'path' from jsonb_array_elements(manifest->'pages');
  perform pg_temp.admin_prepare_digital_book_impl(book,manifest);
  if (pg_temp.get_digital_book_impl(child_a,book)->>'availability')<>'unavailable' then raise exception 'New unapproved edition exposed'; end if;
  update pg_temp.books set status='published';
  update pg_temp.dc_content_reviews set content_fingerprint=pg_temp.dc_entity_fingerprint('book',book);
  if (pg_temp.get_digital_book_impl(child_a,book)->>'page_number')::integer<>1 then raise exception 'Old page position reused for new edition'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  if pg_temp.child_has_digital_book_access(child_a,book) or pg_temp.digital_book_object_readable(book::text||'/edition-2/001.png') then raise exception 'Anonymous reader access'; end if;
end;
$$;
rollback;
