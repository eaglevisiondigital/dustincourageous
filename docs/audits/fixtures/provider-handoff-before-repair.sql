-- Before-repair evidence for commit 29b3d29; isolated database only.
BEGIN;
CREATE TEMP TABLE handoff_probe AS SELECT gen_random_uuid() actor,gen_random_uuid() other_actor,gen_random_uuid() home,gen_random_uuid() product;
GRANT SELECT ON handoff_probe TO authenticated;
INSERT INTO auth.users(id,raw_app_meta_data,raw_user_meta_data) SELECT actor,'{}'::jsonb,'{}'::jsonb FROM handoff_probe UNION ALL SELECT other_actor,'{}'::jsonb,'{}'::jsonb FROM handoff_probe;
INSERT INTO public.households(id,name,created_by) SELECT home,'Synthetic handoff probe',actor FROM handoff_probe;
SET LOCAL session_replication_role=replica;
INSERT INTO public.products(id,product_key,name,product_type,status,base_price_cents,track_inventory) SELECT product,product::text,'Synthetic handoff item','other','active',123,false FROM handoff_probe;
SET LOCAL session_replication_role=origin;
SELECT set_config('request.jwt.claim.sub',actor::text,true) FROM handoff_probe;
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE probe_session(id uuid);
DO $$ DECLARE c record; BEGIN
 SELECT r.* INTO c FROM handoff_probe f CROSS JOIN LATERAL public.create_checkout_order(f.home,jsonb_build_array(jsonb_build_object('product_id',f.product)),NULL) r;
 INSERT INTO probe_session VALUES(c.checkout_session_id);
 BEGIN
  PERFORM public.begin_checkout_provider_handoff(c.checkout_session_id,'synthetic','never-sent-to-provider');
  RAISE EXCEPTION 'Unexpected success';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'Checkout session is unavailable or expired' THEN RAISE; END IF;
  RAISE NOTICE 'Verified actual guardian failure on fresh owned checkout: %',SQLERRM;
 END;
 IF NOT EXISTS(SELECT 1 FROM public.checkout_sessions WHERE id=c.checkout_session_id AND status='created') THEN RAISE EXCEPTION 'Probe changed state'; END IF;
END $$;
RESET ROLE;
GRANT SELECT ON probe_session TO anon;
SELECT set_config('request.jwt.claim.sub',other_actor::text,true) FROM handoff_probe;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.begin_checkout_provider_handoff((SELECT id FROM probe_session),'synthetic','forged'); RAISE EXCEPTION 'Unexpected foreign success';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Checkout session is unavailable or expired' THEN RAISE; END IF; RAISE NOTICE 'Foreign handoff denied before repair'; END;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.begin_checkout_provider_handoff((SELECT id FROM probe_session),'synthetic','forged'); RAISE EXCEPTION 'Unexpected anonymous success';
 EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'Anonymous handoff denied before repair'; END;
END $$;
ROLLBACK;
