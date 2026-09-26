-- Defense in depth in addition to the full independently captured catalog comparison.
DO $$
DECLARE n integer;
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls)) THEN
  RAISE EXCEPTION 'Client roles bypass RLS';
 END IF;
 SELECT count(*) INTO n FROM pg_tables WHERE schemaname='public' AND rowsecurity;
 IF n<>112 THEN RAISE EXCEPTION 'Expected 112 RLS-enabled public tables, got %',n; END IF;
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public';
 IF n<>298 THEN RAISE EXCEPTION 'Expected 298 public policies, got %',n; END IF;
 IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
  WHERE ns.nspname='public' AND c.relkind='v' AND NOT ('security_invoker=true'=ANY(coalesce(c.reloptions,'{}')))) THEN
  RAISE EXCEPTION 'Public view bypasses invoker RLS';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_tables t WHERE t.schemaname='private' AND
  (has_table_privilege('anon',format('%I.%I',t.schemaname,t.tablename),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR
   has_table_privilege('authenticated',format('%I.%I',t.schemaname,t.tablename),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))) THEN
  RAISE EXCEPTION 'Client has direct private table privilege';
 END IF;
 IF NOT has_function_privilege('authenticated','private.guardian_unlock_session_valid(uuid,text)','EXECUTE') OR
    NOT has_function_privilege('authenticated','private.award_completed_book_adventure(uuid,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Narrowly guarded repaired RPC dependencies missing';
 END IF;
 IF has_function_privilege('anon','public.create_guardian_unlock_session(uuid,text)','EXECUTE') OR
    has_function_privilege('anon','public.admin_get_production_launch_gate()','EXECUTE') OR
    has_function_privilege('anon','public.get_digital_book(uuid,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Anonymous access to a protected RPC';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='private' AND p.proname IN ('award_xp_event','evaluate_child_badges','evaluate_badges_after_progress',
    'after_xp_insert_evaluate_badges','after_token_insert_evaluate_badges','unlock_book_milestone_rewards')
   AND (has_function_privilege('authenticated',p.oid,'EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE'))) THEN
  RAISE EXCEPTION 'Raw XP/badge helper exposed to a client';
 END IF;
 IF EXISTS (SELECT 1 FROM cron.job WHERE active) THEN
  RAISE EXCEPTION 'Recovery scheduled an active job';
 END IF;
 IF EXISTS (SELECT 1 FROM vault.decrypted_secrets) THEN
  RAISE EXCEPTION 'Isolated recovery contains Vault secrets';
 END IF;
END $$;
SELECT 'PASS: RLS, guarded helpers, private tables, anonymous RPCs and isolated schedule invariants';
