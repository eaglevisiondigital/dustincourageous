begin;
create temp table payment_lock_fixture as select gen_random_uuid() as actor, gen_random_uuid() as home,gen_random_uuid() as order_id,gen_random_uuid() as session_id;
insert into auth.users(id,raw_app_meta_data,raw_user_meta_data) select actor,'{}','{}' from payment_lock_fixture;
insert into public.households(id,name,created_by) select home,'Payment lock fixture',actor from payment_lock_fixture;
insert into public.orders(id,household_id,purchaser_user_id,order_number,status,total_cents) overriding system value select order_id,home,actor,-floor(random()*1000000000)::bigint,'pending_payment',123 from payment_lock_fixture;
insert into public.checkout_sessions(id,order_id,household_id,user_id,status,payment_provider,provider_checkout_id,expires_at) select session_id,order_id,home,actor,'provider_pending','fixture','session-fixture',now()-interval '1 minute' from payment_lock_fixture;

create temp table payment_lock_results(check_name text);
grant select on payment_lock_fixture to service_role;
grant select,insert on payment_lock_results to service_role;
create function pg_temp.confirm_fixture_payment(p_amount bigint default 123,p_currency text default 'USD',p_checkout text default 'session-fixture',p_provider text default 'fixture') returns void language plpgsql security invoker as $$
declare f record; begin
 select * into f from payment_lock_fixture;
 perform public.mark_order_paid_from_provider(p_order_id:=f.order_id,p_provider:=p_provider,
  p_provider_payment_id:='pay-'||f.order_id,p_provider_event_id:='event-'||f.order_id,
  p_payload:=jsonb_build_object('provider_checkout_id',p_checkout,'amount_cents',p_amount,'currency',p_currency));
end $$;
create function pg_temp.expect_payment_denied(label text,p_amount bigint default 123,p_currency text default 'USD',p_checkout text default 'session-fixture',p_provider text default 'fixture') returns void language plpgsql security invoker as $$
begin
 begin
  perform pg_temp.confirm_fixture_payment(p_amount,p_currency,p_checkout,p_provider);
  raise exception 'Unsafe payment accepted: %',label;
 exception when raise_exception then
  if sqlerrm not like 'Payment does not match%' and sqlerrm not like 'Order cannot transition%' then raise; end if;
 end;
 if exists(select 1 from public.payment_webhook_events where order_id=(select order_id from payment_lock_fixture)) then raise exception 'Failed payment left a receipt'; end if;
 insert into payment_lock_results values(label);
end $$;
set local role service_role;
select pg_temp.expect_payment_denied('Expired checkout rejected inside payment transaction');
update public.checkout_sessions set expires_at=now()+interval '1 hour' where id=(select session_id from payment_lock_fixture);
select pg_temp.expect_payment_denied('Mismatched amount rejected',124);
select pg_temp.expect_payment_denied('Mismatched currency rejected',123,'CAD');
select pg_temp.expect_payment_denied('Mismatched checkout rejected',123,'USD','other');
select pg_temp.expect_payment_denied('Mismatched provider rejected',123,'USD','session-fixture','other');
update public.checkout_sessions set status='canceled' where id=(select session_id from payment_lock_fixture);
select pg_temp.expect_payment_denied('Canceled session with pending order rejected');
update public.checkout_sessions set status='created' where id=(select session_id from payment_lock_fixture);
select pg_temp.expect_payment_denied('Early callback before provider readiness rejected');
update public.checkout_sessions set status='provider_pending' where id=(select session_id from payment_lock_fixture);
update public.orders set status='canceled' where id=(select order_id from payment_lock_fixture);
select pg_temp.expect_payment_denied('Canceled order with pending session rejected');
update public.orders set status='pending_payment' where id=(select order_id from payment_lock_fixture);
select pg_temp.confirm_fixture_payment();
select pg_temp.confirm_fixture_payment();
do $$ declare f record; begin
 select * into f from payment_lock_fixture;
 if (select status from public.orders where id=f.order_id)<>'paid' then raise exception 'Valid order not paid'; end if;
 if (select status from public.checkout_sessions where id=f.session_id)<>'completed' then raise exception 'Valid checkout not completed'; end if;
 if (select count(*) from public.payment_webhook_events where order_id=f.order_id and status='processed')<>1 then raise exception 'Valid payment receipt missing or duplicated'; end if;
 insert into payment_lock_results values('Valid callback commits once and replay is idempotent');
end $$;
reset role;
do $$ begin
 if has_function_privilege('authenticated','public.mark_order_paid_from_provider(uuid,text,text,text,text,text,text,jsonb,jsonb)','EXECUTE') or has_function_privilege('anon','public.mark_order_paid_from_provider(uuid,text,text,text,text,text,text,jsonb,jsonb)','EXECUTE') then raise exception 'Payment mutation exposed to family clients'; end if;
 insert into payment_lock_results values('Payment mutation remains service-role only');
end $$;
select * from payment_lock_results;
rollback;
