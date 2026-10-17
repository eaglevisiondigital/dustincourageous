"""Checkout checks called only by the fixed local Auth/PostgREST harness."""
import uuid


def run(a, b, sql, rpc, good, denied, check):
    product, variant, inactive = [str(uuid.uuid4()) for _ in range(3)]
    promo = 'HTTP-' + uuid.uuid4().hex
    sql(f"""BEGIN; SET LOCAL session_replication_role=replica;
INSERT INTO public.products(id,product_key,name,product_type,status,base_price_cents,track_inventory,inventory_quantity)
VALUES('{product}','{product}','Synthetic HTTP item','other','active',1200,true,20),
('{inactive}','{inactive}','Synthetic inactive item','other','inactive',1200,false,NULL);
INSERT INTO public.product_variants(id,product_id,variant_key,name,price_delta_cents,track_inventory,inventory_quantity)
VALUES('{variant}','{product}','test','Synthetic HTTP variant',150,true,20);
INSERT INTO public.promo_codes(code,discount_type,discount_value) VALUES('{promo}','fixed',300);
COMMIT;""")
    args = {'p_household_id': a['home'], 'p_items': [{'product_id': product, 'variant_id': variant, 'quantity': 2,
            'unit_price_cents': 1, 'total_cents': 1, 'status': 'paid', 'currency': 'CAD', 'user_id': b['id']}], 'p_promo_code': promo}
    order = rpc('create_checkout_order', args, a['token'])[0]
    check(order['subtotal_cents']==2700 and order['discount_cents']==300 and order['total_cents']==2400 and order['currency']=='USD', 'HTTP checkout uses server variant price/promo/currency')
    check(isinstance(order['order_number'],int) and order['order_number']>0, 'HTTP order number valid')
    own = good('/rest/v1/orders?id=eq.'+order['order_id'], token=a['token'])[0]
    check(own['household_id']==a['home'] and own['purchaser_user_id']==a['id'] and own['billing_email']==a['email'] and own['status']=='draft' and own['paid_at'] is None, 'HTTP order is own Auth-bound unpaid draft')
    session = good('/rest/v1/checkout_session_summary?checkout_session_id=eq.'+order['checkout_session_id'], token=a['token'])[0]
    check(session['checkout_status']=='created' and session['total_cents']==2400, 'Existing Edge summary read receives server checkout foundation')
    lines = good('/rest/v1/order_items?order_id=eq.'+order['order_id'], token=a['token'])
    check(len(lines)==1 and lines[0]['unit_price_cents']==1350 and lines[0]['quantity']==2, 'HTTP checkout lines use catalog prices')
    reservations = good('/rest/v1/inventory_reservations?checkout_session_id=eq.'+order['checkout_session_id'], token=a['token'])
    check(len(reservations)==1 and reservations[0]['quantity']==2, 'HTTP checkout reserves variant inventory')
    again = rpc('create_checkout_order',args,a['token'])[0]
    check(again['order_id']!=order['order_id'] and again['order_number']!=order['order_number'], 'Repeated HTTP RPC creates separate unique draft')
    denied('/rest/v1/rpc/create_checkout_order','POST',args,None,'Anonymous checkout RPC denied over HTTP')
    denied('/rest/v1/rpc/create_checkout_order','POST',args,b['token'],'Foreign household checkout denied over HTTP')
    for table, col, value in [('orders','id',order['order_id']),('order_items','order_id',order['order_id']),('checkout_sessions','id',order['checkout_session_id']),('inventory_reservations','checkout_session_id',order['checkout_session_id'])]:
        check(good('/rest/v1/'+table+'?'+col+'=eq.'+value,token=b['token'])==[], 'Foreign HTTP '+table+' read denied')
    for items, label in [([{'product_id':str(uuid.uuid4())}],'invalid product'),([{'product_id':product,'variant_id':str(uuid.uuid4())}],'invalid variant'),([{'product_id':inactive}],'inactive product'),([{'product_id':product},{'product_id':inactive}],'late line failure')]:
        denied('/rest/v1/rpc/create_checkout_order','POST',{'p_household_id':a['home'],'p_items':items},a['token'],'HTTP checkout rejects '+label)
    check(sql(f"SELECT count(*) FROM public.orders WHERE household_id='{a['home']}';")=='2' and sql(f"SELECT count(*) FROM public.inventory_reservations WHERE product_id='{product}';")=='2', 'HTTP failures leave no partial orders/reservations')
    denied('/rest/v1/rpc/create_checkout_order','POST',dict(args,p_total_cents=1),a['token'],'HTTP API has no client-total parameter')
    denied('/rest/v1/orders','POST',{'household_id':a['home'],'purchaser_user_id':a['id'],'status':'paid','total_cents':1},a['token'],'HTTP direct paid order insertion denied')
    check(good('/rest/v1/orders?id=eq.'+order['order_id'],'PATCH',{'status':'paid','total_cents':1},a['token'],headers={'Prefer':'return=representation'})==[], 'HTTP direct paid/total UPDATE cannot affect order')
    denied('/rest/v1/order_items','POST',{'order_id':order['order_id'],'product_id':product,'quantity':1,'unit_price_cents':1,'line_total_cents':1,'product_name_snapshot':'spoof'},a['token'],'HTTP direct cheap line insertion denied')
    denied('/rest/v1/rpc/mark_order_paid_from_provider','POST',{'p_order_id':order['order_id'],'p_provider':'synthetic','p_provider_payment_id':'never-paid'},a['token'],'HTTP service payment RPC denied')
    denied('/rest/v1/household_entitlement_grants','POST',{'household_id':a['home'],'entitlement_key':'digital_books','source_type':'manual'},a['token'],'HTTP checkout grants no direct entitlement privilege')
    # No provider or Edge payment request is sent. Synthetic fixtures are removed
    # by the disposable container teardown, after the final catalog verification.
