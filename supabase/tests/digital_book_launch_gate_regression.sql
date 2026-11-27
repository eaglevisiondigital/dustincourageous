-- Isolated readiness cases. Existing reader tests cover the release helper itself.
begin;
create temp table digital_book_manifests(book_id uuid,manifest jsonb);
create temp table books(id uuid,metadata jsonb,status text);
create temp table objects(bucket_id text,name text);
create temp table buckets(id text,public boolean);
create temp table dc_content_reviews(entity_type text,entity_id uuid,status text,content_fingerprint text);
create function pg_temp.is_app_admin() returns boolean language sql as $$select current_setting('test.admin',true)='true'$$;
create function pg_temp.dc_entity_fingerprint(text,uuid) returns text language sql as $$select 'fixture-fingerprint'::text$$;
create function pg_temp.digital_book_released(target uuid) returns boolean language sql as $$select exists(select 1 from pg_temp.books where id=target and status='published')$$;
do $$
declare definition text;
begin
  if has_function_privilege('anon','private.admin_get_digital_book_launch_gate_impl()','EXECUTE') then raise exception 'Anonymous gate execution exposed'; end if;
  select pg_get_functiondef('private.admin_get_digital_book_launch_gate_impl()'::regprocedure) into definition;
  execute replace(replace(replace(definition,'private.','pg_temp.'),'public.','pg_temp.'),'storage.','pg_temp.');
end;
$$;
do $$
declare book uuid:=gen_random_uuid(); manifest jsonb;
begin
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  perform set_config('test.admin','false',true);
  begin perform * from pg_temp.admin_get_digital_book_launch_gate_impl(); raise exception 'Non-admin gate access'; exception when insufficient_privilege then null; end;
  perform set_config('test.admin','true',true);
  if exists(select 1 from pg_temp.admin_get_digital_book_launch_gate_impl() where passed) then raise exception 'Empty setup reported ready'; end if;
  insert into pg_temp.buckets values('dc-digital-books',false);
  if not (select passed from pg_temp.admin_get_digital_book_launch_gate_impl() where check_key='digital_book_private_storage') then raise exception 'Private bucket not detected'; end if;
  manifest:=jsonb_build_object('revision','test','pages',jsonb_build_array(jsonb_build_object('path','test/001.png','alt','Fixture')));
  insert into pg_temp.digital_book_manifests values(book,manifest);
  insert into pg_temp.books values(book,jsonb_build_object('digital_reader',jsonb_build_object('revision','test','sha256',encode(extensions.digest(manifest::text,'sha256'),'hex'))),'draft');
  if (select passed from pg_temp.admin_get_digital_book_launch_gate_impl() where check_key='digital_book_page_files') then raise exception 'Missing page file accepted'; end if;
  insert into pg_temp.objects values('dc-digital-books','test/001.png');
  if not (select passed from pg_temp.admin_get_digital_book_launch_gate_impl() where check_key='digital_book_page_files') then raise exception 'Prepared file missing from readiness'; end if;
  insert into pg_temp.dc_content_reviews values('book',book,'approved','stale');
  if (select passed from pg_temp.admin_get_digital_book_launch_gate_impl() where check_key='digital_book_current_approval') then raise exception 'Stale approval accepted'; end if;
  update pg_temp.dc_content_reviews set content_fingerprint='fixture-fingerprint';
  if not (select passed from pg_temp.admin_get_digital_book_launch_gate_impl() where check_key='digital_book_current_approval') then raise exception 'Current approval rejected'; end if;
  if (select passed from pg_temp.admin_get_digital_book_launch_gate_impl() where check_key='digital_book_available') then raise exception 'Unreleased edition considered available'; end if;
  update pg_temp.books set status='published';
  if exists(select 1 from pg_temp.admin_get_digital_book_launch_gate_impl() where not passed) then raise exception 'Complete fixture not ready'; end if;
  update pg_temp.buckets set public=true;
  if (select passed from pg_temp.admin_get_digital_book_launch_gate_impl() where check_key='digital_book_private_storage') then raise exception 'Public bucket accepted'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  begin perform * from pg_temp.admin_get_digital_book_launch_gate_impl(); raise exception 'Unauthenticated gate access'; exception when insufficient_privilege then null; end;
end;
$$;
rollback;
