"""Actual Auth/PostgREST handoff; server receipt uses only the disposable local key."""
import uuid


def run(a,b,service,sql,rpc,good,denied,check):
    product=str(uuid.uuid4())
    sql(f"BEGIN; SET LOCAL session_replication_role=replica; INSERT INTO public.products(id,product_key,name,product_type,status,base_price_cents,track_inventory) VALUES('{product}','{product}','Synthetic handoff HTTP','other','active',123,false); COMMIT;")
    def create():return rpc('create_checkout_order',{'p_household_id':a['home'],'p_items':[{'product_id':product}]},a['token'])[0]
    c=create();sid=c['checkout_session_id'];args={'p_checkout_session_id':sid,'p_provider':'synthetic'}
    denied('/rest/v1/rpc/claim_checkout_provider_handoff','POST',args,None,'HTTP anonymous handoff claim denied')
    denied('/rest/v1/rpc/claim_checkout_provider_handoff','POST',args,b['token'],'HTTP foreign handoff claim denied')
    claim=rpc('claim_checkout_provider_handoff',args,a['token'])[0]
    check(claim['disposition']=='invoke_adapter','HTTP owner obtains first durable handoff claim')
    check(rpc('claim_checkout_provider_handoff',args,a['token'])[0]['disposition']=='awaiting_result','HTTP duplicate claim cannot redispatch')
    finish=dict(args,p_provider_checkout_id='ref-'+sid)
    denied('/rest/v1/rpc/begin_checkout_provider_handoff','POST',finish,a['token'],'HTTP guardian cannot finalize unrecorded provider reference')
    receipt={'p_attempt_id':claim['attempt_id'],'p_provider_checkout_id':'ref-'+sid,'p_checkout_url':'https://provider.invalid/'+sid}
    denied('/rest/v1/rpc/record_checkout_handoff_result','POST',receipt,a['token'],'HTTP guardian cannot attest to provider receipt')
    check(good('/rest/v1/checkout_sessions?id=eq.'+sid,'PATCH',{'payment_provider':'forged','provider_checkout_id':'forged','status':'provider_pending'},a['token'],headers={'Prefer':'return=representation'})==[],'HTTP direct session/provider writes still denied')
    rpc('record_checkout_handoff_result',receipt,service)
    check(rpc('claim_checkout_provider_handoff',args,a['token'])[0]['disposition']=='finalize','HTTP server-recorded receipt is recoverable before finalization')
    denied('/rest/v1/rpc/begin_checkout_provider_handoff','POST',dict(finish,p_provider_checkout_id='forged'),a['token'],'HTTP caller cannot replace trusted provider reference')
    rpc('begin_checkout_provider_handoff',finish,a['token'])
    s=good('/rest/v1/checkout_session_summary?checkout_session_id=eq.'+sid,token=a['token'])[0]
    check(s['checkout_status']=='provider_pending' and s['order_status']=='pending_payment' and s['provider_checkout_id']=='ref-'+sid and s['total_cents']==123,'HTTP valid handoff preserves authoritative pending-payment order')
    rpc('begin_checkout_provider_handoff',finish,a['token'])
    check(rpc('claim_checkout_provider_handoff',args,a['token'])[0]['disposition']=='reuse','HTTP repeat reuses finalized reference')
    denied('/rest/v1/rpc/begin_checkout_provider_handoff','POST',finish,b['token'],'HTTP foreign finalization denied')
    denied('/rest/v1/rpc/begin_checkout_provider_handoff','POST',finish,None,'HTTP anonymous finalization denied')
    # Recover from a known failed local attempt with a later trusted reconciled receipt;
    # this never invokes or configures a provider and never resets the dispatch claim.
    failed=create();fa={'p_checkout_session_id':failed['checkout_session_id'],'p_provider':'synthetic'}
    fc=rpc('claim_checkout_provider_handoff',fa,a['token'])[0]
    rpc('record_checkout_handoff_result',{'p_attempt_id':fc['attempt_id'],'p_failure_code':'adapter_unavailable'},service)
    check(rpc('claim_checkout_provider_handoff',fa,a['token'])[0]['disposition']=='awaiting_result','HTTP uncertain adapter outcome blocks redispatch')
    rpc('record_checkout_handoff_result',{'p_attempt_id':fc['attempt_id'],'p_provider_checkout_id':'reconciled-'+fc['attempt_id'],'p_checkout_url':'https://provider.invalid/reconciled'},service)
    check(rpc('claim_checkout_provider_handoff',fa,a['token'])[0]['disposition']=='finalize','HTTP trusted reconciliation can recover an uncertain attempt')
    sql(f"UPDATE public.checkout_sessions SET expires_at=now()-interval '1 second' WHERE id='{failed['checkout_session_id']}';")
    denied('/rest/v1/rpc/begin_checkout_provider_handoff','POST',dict(fa,p_provider_checkout_id='reconciled-'+fc['attempt_id']),a['token'],'HTTP late receipt cannot revive expired checkout')
    # Callback compatibility on the first valid handoff (isolated synthetic only).
    paid={'p_order_id':c['order_id'],'p_provider':'synthetic','p_provider_payment_id':'synthetic-'+sid,'p_provider_event_id':'synthetic-'+sid,'p_payload':{'provider_checkout_id':'ref-'+sid,'amount_cents':123,'currency':'USD'}}
    denied('/rest/v1/rpc/mark_order_paid_from_provider','POST',paid,a['token'],'HTTP handoff never grants guardian payment authority')
    rpc('mark_order_paid_from_provider',paid,service);rpc('mark_order_paid_from_provider',paid,service)
    s=good('/rest/v1/checkout_session_summary?checkout_session_id=eq.'+sid,token=a['token'])[0]
    check(s['checkout_status']=='completed' and s['order_status']=='paid' and sql(f"SELECT count(*) FROM public.payment_webhook_events WHERE order_id='{c['order_id']}';")=='1','HTTP service callback and replay retain existing behavior')
    denied('/rest/v1/rpc/begin_checkout_provider_handoff','POST',finish,a['token'],'HTTP paid checkout cannot reenter handoff')
