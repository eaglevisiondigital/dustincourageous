#!/usr/bin/env python3
"""Isolated real-connection claims, finalization replay and expiry after lock wait."""
import concurrent.futures
import json
import time
import uuid
from checkout_creation_concurrency import query


def run():
    query("DO $$ BEGIN IF current_setting('dc.recovery_mode',true) IS DISTINCT FROM 'isolated' THEN RAISE EXCEPTION 'Isolated only'; END IF; END $$;")
    actor, home, product = [str(uuid.uuid4()) for _ in range(3)]
    tag='handoff_'+uuid.uuid4().hex[:12]
    auth=f"BEGIN; SET LOCAL statement_timeout='20s'; SET LOCAL request.jwt.claim.sub='{actor}'; SET LOCAL request.jwt.claims='{{}}'; SET LOCAL ROLE authenticated;"
    try:
        query(f"BEGIN; INSERT INTO auth.users(id,raw_app_meta_data,raw_user_meta_data) VALUES('{actor}','{{}}','{{}}'); INSERT INTO public.households(id,name,created_by) VALUES('{home}','Synthetic handoff lock','{actor}'); SET LOCAL session_replication_role=replica; INSERT INTO public.products(id,product_key,name,product_type,status,base_price_cents,track_inventory) VALUES('{product}','{product}','Synthetic handoff item','other','active',123,false); COMMIT;")
        c=query(auth+f"SELECT row_to_json(r) FROM public.create_checkout_order('{home}','[{{\"product_id\":\"{product}\"}}]',NULL) r; COMMIT;")[0]
        sid, oid=c['checkout_session_id'],c['order_id']
        def contend(first,second):
            observe=f"SELECT json_build_object('ready',exists(select 1 from pg_stat_activity where application_name='{tag}_holder' and wait_event='PgSleep'),'blocked',exists(select 1 from pg_stat_activity where application_name='{tag}_waiter' and cardinality(pg_blocking_pids(pid))>0));"
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                holder=pool.submit(query,first);deadline=time.monotonic()+10
                while not query(observe)[0]['ready']:
                    assert time.monotonic()<deadline,'Holder not observed';time.sleep(.1)
                waiter=pool.submit(query,second);blocked=False
                while not waiter.done() and time.monotonic()<deadline:
                    blocked |= query(observe)[0]['blocked'];time.sleep(.1)
                results=[holder.result(),waiter.result()]
            assert blocked,'No actual lock contention observed'
            return results
        claim=f"SELECT row_to_json(r) FROM public.claim_checkout_provider_handoff('{sid}','synthetic') r;"
        results=contend(auth+f"SET LOCAL application_name='{tag}_holder';"+claim+'SELECT pg_sleep(3); COMMIT;',auth+f"SET LOCAL application_name='{tag}_waiter';"+claim+'COMMIT;')
        assert [r[0]['disposition'] for r in results]==['invoke_adapter','awaiting_result'],results
        attempt=results[0][0]['attempt_id']
        print('PASS: competing authenticated claims authorize exactly one adapter dispatch',flush=True)
        query(f"BEGIN; SET LOCAL request.jwt.claims='{{\"role\":\"service_role\"}}'; SET LOCAL ROLE service_role; SELECT public.record_checkout_handoff_result('{attempt}','ref-{sid}','https://provider.invalid/{sid}'); COMMIT;")
        finalize=f"SELECT public.begin_checkout_provider_handoff('{sid}','synthetic','ref-{sid}'); RESET ROLE; SELECT json_build_object('finalized_at',finalized_at) FROM private.checkout_handoff_attempts WHERE id='{attempt}';"
        results=contend(auth+f"SET LOCAL application_name='{tag}_holder';"+finalize+'SELECT pg_sleep(3); COMMIT;',auth+f"SET LOCAL application_name='{tag}_waiter';"+finalize+'COMMIT;')
        assert results[0][0]==results[1][0] and results[0][0]['finalized_at'],results
        print('PASS: competing finalizations preserve one reference and one transition timestamp',flush=True)
        c=query(auth+f"SELECT row_to_json(r) FROM public.create_checkout_order('{home}','[{{\"product_id\":\"{product}\"}}]',NULL) r; COMMIT;")[0]
        sid,oid=c['checkout_session_id'],c['order_id']
        # Handoff starts before expiry but waits behind the order lock. now() would
        # be stale when the lock is released; clock_timestamp() must reject it.
        query(f"UPDATE public.checkout_sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id='{sid}';")
        first=f"BEGIN; SET LOCAL application_name='{tag}_holder'; SELECT id FROM public.orders WHERE id='{oid}' FOR UPDATE; SELECT pg_sleep(3); COMMIT;"
        second=auth+f"SET LOCAL application_name='{tag}_waiter'; DO $$ BEGIN PERFORM public.claim_checkout_provider_handoff('{sid}','synthetic'); RAISE EXCEPTION 'Unsafe expired claim'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Checkout session is unavailable or expired' THEN RAISE; END IF; END $$; COMMIT;"
        contend(first,second)
        assert query(f"SELECT json_build_object('attempts',count(*)) FROM private.checkout_handoff_attempts WHERE checkout_session_id='{sid}';")[0]['attempts']==0
        print('PASS: expiry is rechecked after acquiring checkout then order locks',flush=True)
    finally:
        query(f"BEGIN; DELETE FROM public.orders WHERE household_id='{home}'; DELETE FROM public.products WHERE id='{product}'; DELETE FROM public.households WHERE id='{home}'; DELETE FROM auth.users WHERE id='{actor}'; COMMIT;")
        assert query(f"SELECT json_build_object('left',(select count(*) from public.orders where purchaser_user_id='{actor}')+(select count(*) from auth.users where id='{actor}'));")[0]['left']==0


if __name__=='__main__':
    run()
