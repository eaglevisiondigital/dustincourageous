-- ISOLATED ONLY: these denial probes would be destructive under legacy ACLs.
-- Requires the fixed recovery runner setting; all synthetic DDL rolls back.
BEGIN;
DO $$ BEGIN
 IF current_setting('dc.recovery_mode',true) IS DISTINCT FROM 'isolated' THEN
  RAISE EXCEPTION 'Run only through the isolated recovery harness';
 END IF;
END $$;
SET LOCAL statement_timeout='30s';
CREATE TEMP TABLE dc_privilege_checks(label text);
GRANT SELECT,INSERT ON dc_privilege_checks TO anon,authenticated;
CREATE FUNCTION pg_temp.denied(command text,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN
  EXECUTE command;
 EXCEPTION WHEN insufficient_privilege THEN
  INSERT INTO dc_privilege_checks VALUES(label); RETURN;
 END;
 RAISE EXCEPTION 'Expected insufficient_privilege: %',label;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.denied(text,text) TO anon,authenticated;
CREATE SCHEMA dc_privilege_fixture;
GRANT USAGE,CREATE ON SCHEMA dc_privilege_fixture TO anon,authenticated;
CREATE FUNCTION dc_privilege_fixture.trigger_stub() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
GRANT EXECUTE ON FUNCTION dc_privilege_fixture.trigger_stub() TO anon,authenticated;
-- New objects are created as the actual application owner. Explicitly tests the
-- global function default, not merely schema-local ACL inspection.
SET LOCAL ROLE postgres;
CREATE TABLE public.dc_privilege_default_probe(id bigint GENERATED ALWAYS AS IDENTITY);
CREATE VIEW public.dc_privilege_default_view WITH (security_invoker=true) AS SELECT id FROM public.dc_privilege_default_probe;
CREATE FUNCTION public.dc_privilege_default_function() RETURNS integer LANGUAGE sql AS $$SELECT 1$$;
RESET ROLE;
DO $$ DECLARE r record; who text; capability text; BEGIN
 FOREACH who IN ARRAY ARRAY['anon','authenticated'] LOOP
  FOR r IN SELECT c.oid,n.nspname,c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','v') LOOP
   FOREACH capability IN ARRAY ARRAY['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
    IF has_table_privilege(who,r.oid,capability) THEN RAISE EXCEPTION '% holds % on %.%',who,capability,r.nspname,r.relname; END IF;
   END LOOP;
   IF r.relkind='v' AND has_table_privilege(who,r.oid,'INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Writable client view'; END IF;
   IF r.nspname='private' AND has_table_privilege(who,r.oid,'SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Client private table'; END IF;
  END LOOP;
  IF has_table_privilege(who,'public.dc_privilege_default_probe','SELECT,INSERT,UPDATE,DELETE') OR
     has_table_privilege(who,'public.dc_privilege_default_view','SELECT,INSERT,UPDATE,DELETE') OR
     has_function_privilege(who,'public.dc_privilege_default_function()','EXECUTE') OR
     has_sequence_privilege(who,'public.dc_privilege_default_probe_id_seq','USAGE,SELECT,UPDATE') THEN
   RAISE EXCEPTION 'New application object exposed by default for %',who;
  END IF;
  FOR r IN SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND c.relkind='S' LOOP
   IF has_sequence_privilege(who,r.oid,'USAGE,SELECT,UPDATE') THEN RAISE EXCEPTION 'Client sequence grants'; END IF;
  END LOOP;
 END LOOP;
 INSERT INTO dc_privilege_checks VALUES('Every table/view lacks dangerous rights; views read-only; private tables/identity sequences/default-created objects protected');
END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.denied('TRUNCATE public.households CASCADE','authenticated TRUNCATE denied');
SELECT pg_temp.denied('CREATE TABLE dc_privilege_fixture.ref_probe(home uuid REFERENCES public.households(id))','authenticated REFERENCES denied');
SELECT pg_temp.denied('CREATE TRIGGER dc_acl_probe BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION dc_privilege_fixture.trigger_stub()','authenticated TRIGGER denied');
SELECT pg_temp.denied('ALTER TABLE public.households DISABLE TRIGGER ALL','authenticated trigger manipulation denied');
SELECT pg_temp.denied('REINDEX TABLE public.households','authenticated MAINTAIN denied');
SELECT pg_temp.denied('DELETE FROM public.child_profiles','authenticated unauthorized DELETE denied');
SELECT pg_temp.denied('UPDATE public.app_admins SET role=''super_admin''','direct admin assignment denied');
SELECT pg_temp.denied('INSERT INTO public.household_entitlement_grants(household_id,entitlement_key,source_type) VALUES(gen_random_uuid(),''digital_books'',''manual'')','direct entitlement creation denied');
SELECT pg_temp.denied('SELECT * FROM private.guardian_unlock_sessions','private unlock rows denied');
SELECT pg_temp.denied('SELECT private.award_xp_event(gen_random_uuid(),100,''manual'',''test'',gen_random_uuid(),''test'')','raw XP award denied');
SELECT pg_temp.denied('SELECT private.evaluate_child_badges(gen_random_uuid())','raw badge award denied');
SELECT pg_temp.denied('SELECT public.validate_worker_token(''test'',''test'')','server worker helper denied');
SELECT pg_temp.denied('SELECT private.user_can_access_challenge(gen_random_uuid())','former PUBLIC internal helper denied');
DO $$ BEGIN
 BEGIN
  PERFORM private.admin_get_book_launch_gate_impl();
  RAISE EXCEPTION 'Admin gate unexpectedly accepted guardian';
 EXCEPTION WHEN raise_exception THEN
  IF sqlerrm <> 'Adventure Club administrator access required' THEN RAISE; END IF;
 END;
 INSERT INTO dc_privilege_checks VALUES('guardian admin implementation guard enforced');
END $$;
SELECT pg_temp.denied('SELECT setval(''public.support_tickets_ticket_number_seq'',1)','identity sequence manipulation denied');
SELECT pg_temp.denied('UPDATE public.child_group_memberships SET child_profile_id=gen_random_uuid()','group membership protected column denied');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.denied('TRUNCATE public.households CASCADE','anon TRUNCATE denied');
SELECT pg_temp.denied('CREATE TABLE dc_privilege_fixture.ref_probe(home uuid REFERENCES public.households(id))','anon REFERENCES denied');
SELECT pg_temp.denied('CREATE TRIGGER dc_acl_probe BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION dc_privilege_fixture.trigger_stub()','anon TRIGGER denied');
SELECT pg_temp.denied('ALTER TABLE public.households DISABLE TRIGGER ALL','anon trigger manipulation denied');
SELECT pg_temp.denied('REINDEX TABLE public.households','anon MAINTAIN denied');
SELECT pg_temp.denied('SELECT * FROM public.child_profiles','anon child records denied');
SELECT pg_temp.denied('SELECT public.create_household_with_consent(''test'',''UTC'')','anon onboarding denied');
SELECT pg_temp.denied('SELECT public.create_guardian_unlock_session(gen_random_uuid(),''1234'')','anon PIN RPC denied');
SELECT pg_temp.denied('SELECT public.admin_get_production_launch_gate()','anon admin RPC denied');
SELECT pg_temp.denied('SELECT * FROM private.household_guardian_security','anon private schema denied');
RESET ROLE;
SELECT count(*) AS privilege_checks_passed FROM dc_privilege_checks;
ROLLBACK;
