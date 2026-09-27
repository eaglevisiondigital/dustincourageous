#!/usr/bin/env python3
"""Isolated only: two guardians contend for the same final inventory unit.

Uses the recovery runner's local-only libpq environment and synthetic fixtures.
The first successful checkout remains uncommitted while the second starts.
No provider, payment, authorization helper or application function is replaced.
"""
import concurrent.futures
import json
import os
import subprocess
import time
import uuid


def query(sql):
    p = subprocess.run([os.environ.get('PSQL', 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'],
                       input=sql, text=True, capture_output=True, timeout=35)
    if p.returncode:
        raise AssertionError(p.stderr)
    return [json.loads(line) for line in p.stdout.splitlines() if line.startswith('{')]


def run():
    query("DO $$ BEGIN IF current_setting('dc.recovery_mode',true) IS DISTINCT FROM 'isolated' THEN RAISE EXCEPTION 'Isolated recovery only'; END IF; END $$;")
    for variant in (False, True):
        a, b, ha, hb, product, vid = [str(uuid.uuid4()) for _ in range(6)]
        tag = 'dc_checkout_' + uuid.uuid4().hex[:12]
        item = json.dumps([dict(product_id=product, **({'variant_id': vid} if variant else {}))])
        def attempt(actor, home, hold=False):
            return f"""BEGIN; SET LOCAL statement_timeout='25s'; SET LOCAL application_name='{tag}_{'holder' if hold else 'waiter'}';
SET LOCAL request.jwt.claim.sub='{actor}'; SET LOCAL request.jwt.claims='{{}}'; SET LOCAL ROLE authenticated;
DO $$ BEGIN
 PERFORM public.create_checkout_order('{home}','{item}'::jsonb,NULL);
EXCEPTION WHEN raise_exception THEN
 IF SQLERRM NOT LIKE 'Insufficient inventory for %' THEN RAISE; END IF;
END $$;
{'SELECT pg_sleep(6);' if hold else ''} COMMIT;"""
        try:
            query(f"""BEGIN;
INSERT INTO auth.users(id,raw_app_meta_data,raw_user_meta_data) VALUES('{a}','{{}}','{{}}'),('{b}','{{}}','{{}}');
INSERT INTO public.households(id,name,created_by) VALUES('{ha}','Synthetic checkout lock','{a}'),('{hb}','Synthetic checkout lock','{b}');
-- Fixture publication only; real tested operations use all original triggers.
SET LOCAL session_replication_role=replica;
INSERT INTO public.products(id,product_key,name,product_type,status,base_price_cents,track_inventory,inventory_quantity)
VALUES('{product}','{tag}','Synthetic stock','other','active',100,{str(not variant).lower()},1);
INSERT INTO public.product_variants(id,product_id,variant_key,name,track_inventory,inventory_quantity)
VALUES('{vid}','{product}','only','Synthetic variant',true,1);
COMMIT;""")
            observe = f"SELECT json_build_object('ready',exists(select 1 from pg_stat_activity where application_name='{tag}_holder' and wait_event='PgSleep'),'blocked',exists(select 1 from pg_stat_activity where application_name='{tag}_waiter' and cardinality(pg_blocking_pids(pid))>0));"
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                first = pool.submit(query, attempt(a, ha, True))
                deadline = time.monotonic()+10
                while not query(observe)[0]['ready']:
                    assert time.monotonic()<deadline, 'First checkout never acquired inventory lock'
                    time.sleep(.1)
                second = pool.submit(query, attempt(b, hb))
                blocked = False
                while not second.done() and time.monotonic()<deadline:
                    blocked |= query(observe)[0]['blocked']
                    time.sleep(.1)
                first.result(); second.result()
            state = query(f"SELECT json_build_object('orders',(select count(*) from public.orders where household_id in ('{ha}','{hb}')),'reserved',(select coalesce(sum(quantity),0) from public.inventory_reservations where product_id='{product}'));")[0]
            assert blocked and state == {'orders': 1, 'reserved': 1}, {'variant': variant, 'blocked': blocked, **state}
            print('PASS: concurrent '+('variant' if variant else 'product')+' checkout waited, rechecked stock and rolled back loser', flush=True)
        finally:
            query(f"""BEGIN; DELETE FROM public.orders WHERE household_id IN ('{ha}','{hb}');
DELETE FROM public.products WHERE id='{product}'; DELETE FROM public.households WHERE id IN ('{ha}','{hb}');
DELETE FROM auth.users WHERE id IN ('{a}','{b}'); COMMIT;""")
            assert query(f"SELECT json_build_object('left',(select count(*) from public.inventory_reservations where product_id='{product}')+(select count(*) from public.orders where purchaser_user_id in ('{a}','{b}'))+(select count(*) from auth.users where id in ('{a}','{b}')));")[0]['left']==0


if __name__ == '__main__':
    run()
