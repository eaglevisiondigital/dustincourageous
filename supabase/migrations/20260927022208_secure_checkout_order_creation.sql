-- Targeted checkout creation repair. Public API stays invoker; trusted writes
-- are confined to one private operation guarded by auth.uid() + guardian membership.
-- No table, sequence, Auth, policy, default-ACL or existing function grants change.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE OR REPLACE FUNCTION private.create_checkout_order_impl(p_household_id uuid, p_items jsonb, p_promo_code text DEFAULT NULL::text)
 RETURNS TABLE(checkout_session_id uuid, order_id uuid, order_number bigint, subtotal_cents integer, discount_cents integer, total_cents integer, currency text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_order_id uuid;
  v_order_number bigint;
  v_session_id uuid;
  v_expires_at timestamptz := now()+interval '30 minutes';
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_quantity integer;
  v_variant_id uuid;
  v_unit_price integer;
  v_line_total integer;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_total integer := 0;
  v_is_paid_member boolean;
  v_reserved integer;
  v_available integer;
  v_promo public.promo_codes%rowtype;
  v_promo_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not private.can_manage_household(p_household_id) then
    raise exception 'Guardian household access required';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items)=0
     or jsonb_array_length(p_items)>25 then
    raise exception 'Checkout must contain between 1 and 25 line items';
  end if;

  v_is_paid_member := private.household_is_paid_member(p_household_id);

  insert into public.orders as created_order(
    household_id,purchaser_user_id,status,currency,billing_email,metadata
  )
  select
    p_household_id,v_user_id,'draft','USD',u.email,
    jsonb_build_object('checkout_source','adventure_club')
  from auth.users u
  where u.id=v_user_id
  returning created_order.id,created_order.order_number into v_order_id,v_order_number;

  if not found then raise exception 'Authenticated user unavailable'; end if;

  insert into public.checkout_sessions(
    order_id,household_id,user_id,status,expires_at
  )
  values(v_order_id,p_household_id,v_user_id,'created',v_expires_at)
  returning id into v_session_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if (v_item->>'product_id') is null then
      raise exception 'Every checkout item requires product_id';
    end if;

    v_quantity := greatest(coalesce((v_item->>'quantity')::integer,1),1);
    if v_quantity>20 then raise exception 'Maximum quantity per line is 20'; end if;

    -- Serialize reservations against the same stock row, including other households.
    select * into v_product
    from public.products
    where id=(v_item->>'product_id')::uuid
      and status='active'
    for update;

    if not found then raise exception 'Product unavailable'; end if;

    v_variant_id := nullif(v_item->>'variant_id','')::uuid;

    if v_variant_id is not null then
      select * into v_variant
      from public.product_variants
      where id=v_variant_id
        and product_id=v_product.id
        and is_active=true
      for update;

      if not found then raise exception 'Product variant unavailable'; end if;
    else
      v_variant := null;
    end if;

    v_unit_price :=
      case
        when v_is_paid_member and v_product.member_price_cents is not null
          then v_product.member_price_cents
        else v_product.base_price_cents
      end
      + case
          when v_variant_id is null then 0
          when v_is_paid_member then coalesce(v_variant.member_price_delta_cents,0)
          else coalesce(v_variant.price_delta_cents,0)
        end;

    v_unit_price := greatest(v_unit_price,0);
    v_line_total := v_unit_price*v_quantity;
    v_subtotal := v_subtotal+v_line_total;

    if v_variant_id is not null and v_variant.track_inventory and v_variant.inventory_quantity is not null then
      select coalesce(sum(ir.quantity),0)::integer into v_reserved
      from public.inventory_reservations ir
      where ir.product_variant_id=v_variant_id
        and ir.released_at is null
        and ir.expires_at>now();

      v_available := v_variant.inventory_quantity-v_reserved;
      if v_available < v_quantity and not v_product.allow_backorder then
        raise exception 'Insufficient inventory for %',v_variant.name;
      end if;
    elsif v_product.track_inventory and v_product.inventory_quantity is not null then
      select coalesce(sum(ir.quantity),0)::integer into v_reserved
      from public.inventory_reservations ir
      where ir.product_id=v_product.id
        and ir.product_variant_id is null
        and ir.released_at is null
        and ir.expires_at>now();

      v_available := v_product.inventory_quantity-v_reserved;
      if v_available < v_quantity and not v_product.allow_backorder then
        raise exception 'Insufficient inventory for %',v_product.name;
      end if;
    end if;

    insert into public.order_items(
      order_id,product_id,product_variant_id,quantity,unit_price_cents,
      discount_cents,line_total_cents,product_name_snapshot,
      variant_name_snapshot,sku_snapshot
    )
    values(
      v_order_id,v_product.id,v_variant_id,v_quantity,v_unit_price,
      0,v_line_total,v_product.name,
      case when v_variant_id is null then null else v_variant.name end,
      coalesce(case when v_variant_id is null then null else v_variant.sku end,v_product.sku)
    );

    if (v_variant_id is not null and v_variant.track_inventory and v_variant.inventory_quantity is not null)
       or (v_variant_id is null and v_product.track_inventory and v_product.inventory_quantity is not null) then
      insert into public.inventory_reservations(
        checkout_session_id,product_id,product_variant_id,quantity,expires_at
      )
      values(v_session_id,v_product.id,v_variant_id,v_quantity,v_expires_at);
    end if;
  end loop;

  if nullif(trim(p_promo_code),'') is not null then
    select * into v_promo
    from public.promo_codes
    where upper(code)=upper(trim(p_promo_code))
      and is_active=true
      and (starts_at is null or starts_at<=now())
      and (ends_at is null or ends_at>now())
      and (max_redemptions is null or redemption_count<max_redemptions)
    for update;

    if not found then raise exception 'Promo code is invalid or expired'; end if;
    if v_subtotal < v_promo.minimum_order_cents then
      raise exception 'Order does not meet the promo code minimum';
    end if;

    v_discount := case
      when v_promo.discount_type='percent'
        then floor(v_subtotal*(least(v_promo.discount_value,100)::numeric/100))::integer
      else least(v_promo.discount_value,v_subtotal)
    end;
    v_promo_id := v_promo.id;
  end if;

  v_total := greatest(v_subtotal-v_discount,0);

  update public.orders
  set subtotal_cents=v_subtotal,
      discount_cents=v_discount,
      total_cents=v_total,
      promo_code_id=v_promo_id,
      updated_at=now()
  where id=v_order_id;

  return query
  select
    v_session_id,v_order_id,v_order_number,v_subtotal,v_discount,v_total,'USD'::text,v_expires_at;
exception
  when others then
    if v_order_id is not null then
      delete from public.orders where id=v_order_id;
    end if;
    raise;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_checkout_order(p_household_id uuid, p_items jsonb, p_promo_code text DEFAULT NULL::text)
 RETURNS TABLE(checkout_session_id uuid, order_id uuid, order_number bigint, subtotal_cents integer, discount_cents integer, total_cents integer, currency text, expires_at timestamp with time zone)

 LANGUAGE sql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
  SELECT * FROM private.create_checkout_order_impl(p_household_id,p_items,p_promo_code);
$function$;

ALTER FUNCTION private.create_checkout_order_impl(uuid,jsonb,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION private.create_checkout_order_impl(uuid,jsonb,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.create_checkout_order_impl(uuid,jsonb,text) TO authenticated;
COMMENT ON FUNCTION private.create_checkout_order_impl(uuid,jsonb,text) IS
'Guarded checkout creation only: Auth UID and active household guardian required; server-priced draft order, own Auth email, created session and reservations. Never marks payment or grants access.';
NOTIFY pgrst, 'reload schema';
