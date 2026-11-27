-- ISOLATED ONLY. Synthetic fixtures and test helpers roll back; original RLS,
-- authorization functions and triggers are active for every tested operation.
BEGIN;
DO $$ BEGIN
 IF current_setting('dc.recovery_mode',true) IS DISTINCT FROM 'isolated' THEN RAISE EXCEPTION 'Isolated recovery only'; END IF;
END $$;
SET LOCAL statement_timeout='30s';
CREATE TEMP TABLE checkout_fixture AS SELECT
 gen_random_uuid() actor,gen_random_uuid() other_actor,gen_random_uuid() adult,
 gen_random_uuid() home,gen_random_uuid() other_home,gen_random_uuid() product,
 gen_random_uuid() inactive,gen_random_uuid() variant,gen_random_uuid() inactive_variant,
 gen_random_uuid() foreign_variant,gen_random_uuid() plan,
 'SYNTH-'||gen_random_uuid()::text promo;
CREATE TEMP TABLE checkout_results(label text);
CREATE TEMP TABLE checkout_created AS SELECT * FROM public.create_checkout_order(NULL,'[]',NULL) WITH NO DATA;
GRANT SELECT ON checkout_fixture TO authenticated,anon;
GRANT SELECT,INSERT ON checkout_results,checkout_created TO authenticated,anon;
CREATE FUNCTION pg_temp.ok(value boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF;
 INSERT INTO checkout_results VALUES(label);
END $$;
CREATE FUNCTION pg_temp.reject(command text,expected text,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 BEGIN EXECUTE command;
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE expected THEN RAISE; END IF;
  INSERT INTO checkout_results VALUES(label); RETURN;
 END;
 RAISE EXCEPTION 'Unexpected success: %',label;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.ok(boolean,text),pg_temp.reject(text,text,text) TO authenticated,anon;
INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data)
 SELECT actor,'synthetic-checkout@example.invalid','{}'::jsonb,'{}'::jsonb FROM checkout_fixture
 UNION ALL SELECT other_actor,'synthetic-other@example.invalid','{}'::jsonb,'{}'::jsonb FROM checkout_fixture
 UNION ALL SELECT adult,'synthetic-adult@example.invalid','{}'::jsonb,'{}'::jsonb FROM checkout_fixture;
INSERT INTO public.households(id,name,created_by)
 SELECT home,'Synthetic checkout',actor FROM checkout_fixture
 UNION ALL SELECT other_home,'Synthetic other checkout',other_actor FROM checkout_fixture;
INSERT INTO public.household_members(household_id,user_id,role,status) SELECT home,adult,'adult','active' FROM checkout_fixture;
-- Synthetic catalog fixture setup only, not content/governance approval.
SET LOCAL session_replication_role=replica;
INSERT INTO public.products(id,product_key,name,product_type,status,base_price_cents,member_price_cents,track_inventory,inventory_quantity)
 SELECT product,product::text,'Synthetic item','other','active',1000,700,true,100 FROM checkout_fixture
 UNION ALL SELECT inactive,inactive::text,'Unavailable fixture','other','inactive',900,600,false,NULL FROM checkout_fixture;
INSERT INTO public.product_variants(id,product_id,variant_key,name,price_delta_cents,member_price_delta_cents,is_active,track_inventory,inventory_quantity)
 SELECT variant,product,'active','Synthetic variant',200,100,true,true,100 FROM checkout_fixture
 UNION ALL SELECT inactive_variant,product,'inactive','Inactive fixture',200,100,false,true,100 FROM checkout_fixture
 UNION ALL SELECT foreign_variant,inactive,'foreign','Foreign product variant',200,100,true,true,100 FROM checkout_fixture;
SET LOCAL session_replication_role=origin;
INSERT INTO public.membership_plans(id,plan_key,name) SELECT plan,plan::text,'Synthetic paid plan' FROM checkout_fixture;
INSERT INTO public.promo_codes(code,discount_type,discount_value,minimum_order_cents) SELECT promo,'percent',10,1000 FROM checkout_fixture;
SELECT set_config('request.jwt.claim.sub',actor::text,true) FROM checkout_fixture;
SET LOCAL request.jwt.claims='{}';
SET LOCAL ROLE authenticated;
INSERT INTO checkout_created SELECT result.* FROM checkout_fixture f CROSS JOIN LATERAL public.create_checkout_order(f.home,
 jsonb_build_array(jsonb_build_object('product_id',f.product,'variant_id',f.variant,'quantity',2,
 'unit_price_cents',1,'total_cents',1,'currency','CAD','purchaser_user_id',f.other_actor,'status','paid')),lower(f.promo)) result;
SELECT pg_temp.ok((SELECT count(*)=1 AND min(order_number)>0 FROM checkout_created),'Guardian creates valid numbered checkout');
SELECT pg_temp.ok((SELECT subtotal_cents=2400 AND discount_cents=240 AND total_cents=2160 AND currency='USD' AND expires_at=now()+interval '30 minutes' FROM checkout_created),'Server variant price, promo, USD and expiry ignore client overrides');
SELECT pg_temp.ok((SELECT o.purchaser_user_id=f.actor AND o.household_id=f.home AND o.billing_email='synthetic-checkout@example.invalid' AND o.status='draft' AND o.paid_at IS NULL AND cs.user_id=f.actor AND cs.household_id=f.home AND cs.status='created' FROM checkout_created c JOIN public.orders o ON o.id=c.order_id JOIN public.checkout_sessions cs ON cs.id=c.checkout_session_id CROSS JOIN checkout_fixture f),'Auth identity, own email and household bind draft order/session');
SELECT pg_temp.ok((SELECT oi.unit_price_cents=1200 AND oi.quantity=2 AND oi.line_total_cents=2400 AND oi.product_name_snapshot='Synthetic item' AND oi.variant_name_snapshot='Synthetic variant' FROM public.order_items oi JOIN checkout_created c ON c.order_id=oi.order_id),'Immutable line snapshots use catalog values');
SELECT pg_temp.ok((SELECT ir.quantity=2 AND ir.expires_at=c.expires_at AND ir.released_at IS NULL FROM public.inventory_reservations ir JOIN checkout_created c ON c.checkout_session_id=ir.checkout_session_id),'Inventory reservation bound to expiring session');
INSERT INTO checkout_created SELECT result.* FROM checkout_fixture f CROSS JOIN LATERAL public.create_checkout_order(f.home,jsonb_build_array(jsonb_build_object('product_id',f.product,'quantity',1)),NULL) result;
SELECT pg_temp.ok((SELECT count(DISTINCT order_number)=2 AND count(DISTINCT order_id)=2 FROM checkout_created),'Repeated requests create separate unique drafts; API has no idempotency key');
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,'[]'),'Checkout must contain%','Empty cart rejected') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,NULL,NULL)',home),'Checkout must contain%','SQL NULL cart rejected') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,'null'),'Checkout must contain%','JSON null cart rejected') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,'[{}]'),'Every checkout item requires%','Missing product rejected') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,jsonb_build_array(jsonb_build_object('product_id',gen_random_uuid()))),'Product unavailable','Invalid product rejected') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,jsonb_build_array(jsonb_build_object('product_id',inactive))),'Product unavailable','Inactive product rejected') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,jsonb_build_array(jsonb_build_object('product_id',product,'variant_id',gen_random_uuid()))),'Product variant unavailable','Invalid variant rejected') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,jsonb_build_array(jsonb_build_object('product_id',product,'variant_id',inactive_variant))),'Product variant unavailable','Inactive variant rejected') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,jsonb_build_array(jsonb_build_object('product_id',product,'variant_id',foreign_variant))),'Product variant unavailable','Variant must belong to selected product') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,jsonb_build_array(jsonb_build_object('product_id',product,'quantity',21))),'Maximum quantity%','Quantity cap preserved') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,to_jsonb(array_fill(jsonb_build_object('product_id',product),ARRAY[26]))),'Checkout must contain%','Line count cap preserved') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,to_jsonb(array_fill(jsonb_build_object('product_id',product,'quantity',20),ARRAY[6]))),'Insufficient inventory for %','Repeated lines cannot exceed available stock') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,%L)',home,jsonb_build_array(jsonb_build_object('product_id',product)),'missing'),'Promo code is invalid or expired','Unknown promo rejected') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,jsonb_build_array(jsonb_build_object('product_id',product),jsonb_build_object('product_id',inactive))),'Product unavailable','Late line failure rolls back earlier writes') FROM checkout_fixture;
SELECT pg_temp.ok((SELECT count(*)=2 FROM public.orders WHERE household_id=(SELECT home FROM checkout_fixture)) AND (SELECT count(*)=2 FROM public.order_items WHERE order_id IN (SELECT order_id FROM checkout_created)) AND (SELECT count(*)=2 FROM public.inventory_reservations WHERE checkout_session_id IN (SELECT checkout_session_id FROM checkout_created)),'Failed requests leave no partial orders, lines or reservations');
SELECT pg_temp.reject(format('INSERT INTO public.orders(household_id,purchaser_user_id,status) VALUES(%L,%L,%L)',home,actor,'paid'),'new row violates row-level security%','Direct order insertion denied') FROM checkout_fixture;
WITH changed AS (UPDATE public.orders SET status='paid',total_cents=1 WHERE id IN (SELECT order_id FROM checkout_created) RETURNING id) SELECT pg_temp.ok((SELECT count(*)=0 FROM changed),'Direct paid/total UPDATE denied by RLS');
SELECT pg_temp.reject(format('INSERT INTO public.household_entitlement_grants(household_id,entitlement_key,source_type) VALUES(%L,%L,%L)',home,'digital_books','manual'),'permission denied%','Direct entitlement grant denied') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT public.mark_order_paid_from_provider(%L,%L,%L)',order_id,'synthetic','synthetic'),'permission denied%','Service payment RPC denied to guardian') FROM checkout_created LIMIT 1;
SELECT pg_temp.reject('SELECT email FROM auth.users','permission denied%','Auth users table still private');
SELECT set_config('request.jwt.claim.sub',other_actor::text,true) FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,jsonb_build_array(jsonb_build_object('product_id',product))),'Guardian household access required','Foreign household creation denied') FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM private.create_checkout_order_impl(%L,%L,NULL)',home,jsonb_build_array(jsonb_build_object('product_id',product))),'Guardian household access required','Direct private helper repeats guardian check') FROM checkout_fixture;
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM public.orders WHERE id IN (SELECT order_id FROM checkout_created)) AND NOT EXISTS(SELECT 1 FROM public.checkout_sessions WHERE id IN (SELECT checkout_session_id FROM checkout_created)) AND NOT EXISTS(SELECT 1 FROM public.order_items WHERE order_id IN (SELECT order_id FROM checkout_created)),'Foreign orders, sessions and items hidden');
SELECT set_config('request.jwt.claim.sub',adult::text,true) FROM checkout_fixture;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,jsonb_build_array(jsonb_build_object('product_id',product))),'Guardian household access required','Non-guardian adult denied') FROM checkout_fixture;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.reject(format('SELECT * FROM private.create_checkout_order_impl(%L,%L,NULL)',home,'[]'),'Authentication required','Missing Auth UID denied inside trusted boundary') FROM checkout_fixture;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,NULL)',home,'[]'),'permission denied%','Anonymous RPC denied') FROM checkout_fixture;
RESET ROLE;
-- Paid membership is scoped to the checkout household; no pricing decisions are invented.
INSERT INTO public.household_subscriptions(household_id,plan_id,status,current_period_end) SELECT home,plan,'active',now()+interval '1 day' FROM checkout_fixture;
SELECT set_config('request.jwt.claim.sub',actor::text,true) FROM checkout_fixture;
SET LOCAL ROLE authenticated;
SELECT pg_temp.ok((SELECT subtotal_cents=800 FROM checkout_fixture f CROSS JOIN LATERAL public.create_checkout_order(f.home,jsonb_build_array(jsonb_build_object('product_id',f.product,'variant_id',f.variant)),NULL)),'Eligible household receives existing member price and variant delta');
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,%L)',home,jsonb_build_array(jsonb_build_object('product_id',product)),promo),'Order does not meet%','Promo minimum enforced after member pricing') FROM checkout_fixture;
SELECT set_config('request.jwt.claim.sub',other_actor::text,true) FROM checkout_fixture;
SELECT pg_temp.ok((SELECT subtotal_cents=1200 FROM checkout_fixture f CROSS JOIN LATERAL public.create_checkout_order(f.other_home,jsonb_build_array(jsonb_build_object('product_id',f.product,'variant_id',f.variant)),NULL)),'Foreign paid membership never discounts another household');
RESET ROLE;
UPDATE public.household_subscriptions SET current_period_end=now()-interval '1 second' WHERE household_id=(SELECT home FROM checkout_fixture);
UPDATE public.promo_codes SET discount_type='fixed',discount_value=5000,minimum_order_cents=0 WHERE code=(SELECT promo FROM checkout_fixture);
SELECT set_config('request.jwt.claim.sub',actor::text,true) FROM checkout_fixture;
SET LOCAL ROLE authenticated;
SELECT pg_temp.ok((SELECT subtotal_cents=1000 AND discount_cents=1000 AND total_cents=0 FROM checkout_fixture f CROSS JOIN LATERAL public.create_checkout_order(f.home,jsonb_build_array(jsonb_build_object('product_id',f.product)),f.promo)),'Expired membership uses base price; fixed promo capped at subtotal');
RESET ROLE;
UPDATE public.promo_codes SET is_active=false WHERE code=(SELECT promo FROM checkout_fixture);
SET LOCAL ROLE authenticated;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,%L)',home,jsonb_build_array(jsonb_build_object('product_id',product)),promo),'Promo code is invalid or expired','Inactive promo denied') FROM checkout_fixture;
RESET ROLE;
UPDATE public.promo_codes SET is_active=true,ends_at=now()-interval '1 second' WHERE code=(SELECT promo FROM checkout_fixture);
SET LOCAL ROLE authenticated;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,%L)',home,jsonb_build_array(jsonb_build_object('product_id',product)),promo),'Promo code is invalid or expired','Expired promo denied') FROM checkout_fixture;
RESET ROLE;
UPDATE public.promo_codes SET ends_at=NULL,max_redemptions=1,redemption_count=1 WHERE code=(SELECT promo FROM checkout_fixture);
SET LOCAL ROLE authenticated;
SELECT pg_temp.reject(format('SELECT * FROM public.create_checkout_order(%L,%L,%L)',home,jsonb_build_array(jsonb_build_object('product_id',product)),promo),'Promo code is invalid or expired','Exhausted promo denied') FROM checkout_fixture;
RESET ROLE;
SELECT pg_temp.ok(NOT EXISTS(SELECT 1 FROM public.household_entitlement_grants WHERE household_id IN (SELECT home FROM checkout_fixture UNION ALL SELECT other_home FROM checkout_fixture)) AND NOT EXISTS(SELECT 1 FROM public.orders WHERE household_id IN (SELECT home FROM checkout_fixture UNION ALL SELECT other_home FROM checkout_fixture) AND (status<>'draft' OR paid_at IS NOT NULL)),'All creation paths including zero total stay unpaid and grant no entitlements');
-- Expiry cleanup is the existing owner job, never exposed as a client mutation.
UPDATE public.checkout_sessions SET expires_at=now()-interval '1 second' WHERE id IN (SELECT checkout_session_id FROM checkout_created);
SELECT private.expire_checkout_sessions();
SELECT pg_temp.ok((SELECT bool_and(status='expired') FROM public.checkout_sessions WHERE id IN (SELECT checkout_session_id FROM checkout_created)) AND (SELECT bool_and(status='canceled') FROM public.orders WHERE id IN (SELECT order_id FROM checkout_created)) AND (SELECT bool_and(released_at IS NOT NULL) FROM public.inventory_reservations WHERE checkout_session_id IN (SELECT checkout_session_id FROM checkout_created)),'Existing expiry cancels abandoned drafts and releases reservations');
SELECT pg_temp.ok(NOT has_function_privilege('anon','private.create_checkout_order_impl(uuid,jsonb,text)','EXECUTE') AND NOT has_function_privilege('service_role','private.create_checkout_order_impl(uuid,jsonb,text)','EXECUTE') AND has_function_privilege('authenticated','private.create_checkout_order_impl(uuid,jsonb,text)','EXECUTE'),'Only authenticated callers receive explicit helper execution');
SELECT count(*) AS checkout_checks_passed FROM checkout_results;
SELECT * FROM checkout_results;
ROLLBACK;
