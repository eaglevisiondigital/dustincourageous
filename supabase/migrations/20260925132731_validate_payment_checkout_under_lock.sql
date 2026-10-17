CREATE OR REPLACE FUNCTION public.mark_order_paid_from_provider(p_order_id uuid, p_provider text, p_provider_payment_id text, p_provider_customer_id text DEFAULT NULL::text, p_provider_event_id text DEFAULT NULL::text, p_event_type text DEFAULT 'payment_succeeded'::text, p_shipping_name text DEFAULT NULL::text, p_shipping_address jsonb DEFAULT NULL::jsonb, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_session_id uuid;
  v_checkout public.checkout_sessions%rowtype;
  v_total bigint;
  v_currency text;
  v_promo_id uuid;
  v_previous_status text;
  v_item record;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
begin
  if nullif(trim(p_provider),'') is null or nullif(trim(p_provider_payment_id),'') is null then
    raise exception 'Provider and payment id are required';
  end if;

  if p_provider_event_id is not null then
    insert into public.payment_webhook_events(
      provider,provider_event_id,event_type,order_id,status,payload
    )
    values(
      p_provider,p_provider_event_id,p_event_type,p_order_id,'processing',coalesce(p_payload,'{}'::jsonb)
    )
    on conflict(provider,provider_event_id) do nothing;

    if not found then return; end if;
  end if;

  -- Cancellation and expiry lock checkout before order. Use the same order.
  select * into v_checkout from public.checkout_sessions
  where order_id=p_order_id for update;
  if not found then raise exception 'Checkout session required for payment confirmation'; end if;

  select status,promo_code_id,total_cents,currency
    into v_previous_status,v_promo_id,v_total,v_currency
  from public.orders
  where id=p_order_id
  for update;

  if not found then raise exception 'Order not found'; end if;

  if v_previous_status='paid' then
    if p_provider_event_id is not null then
      update public.payment_webhook_events
      set status='ignored',processed_at=now()
      where provider=p_provider and provider_event_id=p_provider_event_id;
    end if;
    return;
  end if;

  if v_previous_status <> 'pending_payment' then
    raise exception 'Order cannot transition to paid from status %',v_previous_status;
  end if;

  -- Recheck under both locks. An earlier Edge lookup cannot authorize this write.
  if v_checkout.status <> 'provider_pending' or v_checkout.expires_at <= clock_timestamp()
    or v_checkout.payment_provider is distinct from p_provider
    or nullif(trim(p_provider_event_id),'') is null
    or nullif(trim(v_checkout.provider_checkout_id),'') is null
    or p_payload->>'provider_checkout_id' is distinct from v_checkout.provider_checkout_id
    or p_payload->'amount_cents' is distinct from to_jsonb(v_total)
    or upper(p_payload->>'currency') is distinct from upper(v_currency) then
    raise exception 'Payment does not match a current provider checkout';
  end if;

  for v_item in
    select oi.product_id,oi.product_variant_id,oi.quantity
    from public.order_items oi
    where oi.order_id=p_order_id
  loop
    if v_item.product_variant_id is not null then
      select * into v_variant
      from public.product_variants
      where id=v_item.product_variant_id
      for update;

      if v_variant.track_inventory and v_variant.inventory_quantity is not null then
        if v_variant.inventory_quantity < v_item.quantity then
          raise exception 'Insufficient variant inventory at payment confirmation';
        end if;

        update public.product_variants
        set inventory_quantity=inventory_quantity-v_item.quantity,
            updated_at=now()
        where id=v_item.product_variant_id;
      end if;
    else
      select * into v_product
      from public.products
      where id=v_item.product_id
      for update;

      if v_product.track_inventory and v_product.inventory_quantity is not null then
        if v_product.inventory_quantity < v_item.quantity then
          raise exception 'Insufficient product inventory at payment confirmation';
        end if;

        update public.products
        set inventory_quantity=inventory_quantity-v_item.quantity,
            updated_at=now()
        where id=v_item.product_id;
      end if;
    end if;
  end loop;

  update public.orders
  set status='paid',
      payment_provider=p_provider,
      provider_customer_id=p_provider_customer_id,
      provider_payment_id=p_provider_payment_id,
      shipping_name=coalesce(nullif(trim(p_shipping_name),''),shipping_name),
      shipping_address=coalesce(p_shipping_address,shipping_address),
      paid_at=now(),
      updated_at=now()
  where id=p_order_id;

  select id into v_session_id
  from public.checkout_sessions
  where order_id=p_order_id
  limit 1;

  if v_session_id is not null then
    update public.checkout_sessions
    set status='completed',completed_at=now(),updated_at=now()
    where id=v_session_id;

    update public.inventory_reservations
    set released_at=coalesce(released_at,now())
    where checkout_session_id=v_session_id;
  end if;

  if v_promo_id is not null then
    update public.promo_codes
    set redemption_count=redemption_count+1,updated_at=now()
    where id=v_promo_id;
  end if;

  if p_provider_event_id is not null then
    update public.payment_webhook_events
    set status='processed',processed_at=now()
    where provider=p_provider and provider_event_id=p_provider_event_id;
  end if;
end;
$function$;
