-- One durable dispatch claim per checkout; existing client table ACLs/RLS stay intact.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE TABLE private.checkout_handoff_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 checkout_session_id uuid NOT NULL UNIQUE REFERENCES public.checkout_sessions(id) ON DELETE CASCADE,
 provider text NOT NULL CHECK (nullif(btrim(provider),'') IS NOT NULL),
 state text NOT NULL DEFAULT 'claimed' CHECK (state IN ('claimed','result_ready','finalized','needs_reconciliation')),
 provider_checkout_id text,
 checkout_url text,
 failure_code text CHECK (failure_code IN ('adapter_unavailable','adapter_rejected','adapter_response_invalid','expired_before_dispatch')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 result_recorded_at timestamptz,
 finalized_at timestamptz,
 CHECK ((state IN ('result_ready','finalized') AND nullif(btrim(provider_checkout_id),'') IS NOT NULL AND checkout_url IS NOT NULL)
     OR (state IN ('claimed','needs_reconciliation') AND provider_checkout_id IS NULL AND checkout_url IS NULL))
);
ALTER TABLE private.checkout_handoff_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.checkout_handoff_attempts FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE private.checkout_handoff_attempts IS
'One irreversible dispatch claim per checkout. No automatic redispatch: uncertain attempts require provider reconciliation using checkout/session and attempt IDs. Private provider URLs are never exposed by table grants.';

CREATE FUNCTION private.claim_checkout_provider_handoff_impl(p_checkout_session_id uuid,p_provider text)
RETURNS TABLE(attempt_id uuid,disposition text,provider_checkout_id text,checkout_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_uid uuid := (SELECT auth.uid());
 v_session public.checkout_sessions%rowtype;
 v_order public.orders%rowtype;
 v_attempt private.checkout_handoff_attempts%rowtype;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF nullif(btrim(p_provider),'') IS NULL THEN RAISE EXCEPTION 'Provider is required'; END IF;
 -- Match the payment callback/expiry lock order: checkout, order, then attempt.
 SELECT cs.* INTO v_session FROM public.checkout_sessions cs
 WHERE cs.id=p_checkout_session_id AND cs.user_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Checkout session is unavailable or expired'; END IF;
 SELECT o.* INTO v_order FROM public.orders o WHERE o.id=v_session.order_id FOR UPDATE;
 IF NOT FOUND OR v_order.purchaser_user_id IS DISTINCT FROM v_uid
    OR v_order.household_id IS DISTINCT FROM v_session.household_id
    OR NOT private.can_manage_household(v_session.household_id)
    OR v_session.expires_at<=clock_timestamp() THEN
  RAISE EXCEPTION 'Checkout session is unavailable or expired';
 END IF;
 SELECT a.* INTO v_attempt FROM private.checkout_handoff_attempts a WHERE a.checkout_session_id=v_session.id FOR UPDATE;
 IF FOUND THEN
  IF v_attempt.provider IS DISTINCT FROM p_provider THEN RAISE EXCEPTION 'Checkout handoff already claimed'; END IF;
  IF v_attempt.state='finalized' THEN
   IF v_session.status<>'provider_pending' OR v_order.status<>'pending_payment'
      OR v_session.payment_provider IS DISTINCT FROM v_attempt.provider
      OR v_order.payment_provider IS DISTINCT FROM v_attempt.provider
      OR v_session.provider_checkout_id IS DISTINCT FROM v_attempt.provider_checkout_id THEN
    RAISE EXCEPTION 'Checkout session is unavailable or expired';
   END IF;
   RETURN QUERY SELECT v_attempt.id,'reuse'::text,v_attempt.provider_checkout_id,v_attempt.checkout_url;
   RETURN;
  END IF;
  IF v_session.status<>'created' OR v_order.status<>'draft'
     OR v_session.payment_provider IS NOT NULL OR v_session.provider_checkout_id IS NOT NULL
     OR v_order.payment_provider IS NOT NULL THEN
   RAISE EXCEPTION 'Checkout session is unavailable or expired';
  END IF;
  RETURN QUERY SELECT v_attempt.id,CASE WHEN v_attempt.state='result_ready' THEN 'finalize' ELSE 'awaiting_result' END,
    v_attempt.provider_checkout_id,v_attempt.checkout_url;
  RETURN;
 END IF;
 IF v_session.status<>'created' OR v_order.status<>'draft'
    OR v_session.payment_provider IS NOT NULL OR v_session.provider_checkout_id IS NOT NULL
    OR v_order.payment_provider IS NOT NULL THEN
  RAISE EXCEPTION 'Checkout session is unavailable or expired';
 END IF;
 INSERT INTO private.checkout_handoff_attempts(checkout_session_id,provider)
 VALUES(v_session.id,p_provider) RETURNING * INTO v_attempt;
 RETURN QUERY SELECT v_attempt.id,'invoke_adapter'::text,NULL::text,NULL::text;
END $$;
CREATE FUNCTION public.claim_checkout_provider_handoff(p_checkout_session_id uuid,p_provider text)
RETURNS TABLE(attempt_id uuid,disposition text,provider_checkout_id text,checkout_url text)
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT * FROM private.claim_checkout_provider_handoff_impl(p_checkout_session_id,p_provider);
$$;

-- Only the trusted Edge/service caller can attest to the adapter response.
-- Store even a late response: it remains diagnosable after cancellation/expiry,
-- but cannot make that checkout payable. No session/order is updated here.
CREATE FUNCTION private.record_checkout_handoff_result_impl(p_attempt_id uuid,p_provider_checkout_id text DEFAULT NULL,p_checkout_url text DEFAULT NULL,p_failure_code text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_attempt private.checkout_handoff_attempts%rowtype;
BEGIN
 IF (SELECT auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service authorization required'; END IF;
 SELECT a.* INTO v_attempt FROM private.checkout_handoff_attempts a WHERE a.id=p_attempt_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Handoff attempt not found'; END IF;
 IF p_failure_code IS NOT NULL THEN
  IF p_failure_code NOT IN ('adapter_unavailable','adapter_rejected','adapter_response_invalid','expired_before_dispatch')
     OR p_provider_checkout_id IS NOT NULL OR p_checkout_url IS NOT NULL THEN RAISE EXCEPTION 'Invalid handoff result'; END IF;
  IF v_attempt.state IN ('result_ready','finalized') THEN RETURN; END IF;
  UPDATE private.checkout_handoff_attempts SET state='needs_reconciliation',failure_code=p_failure_code,result_recorded_at=clock_timestamp() WHERE id=p_attempt_id;
  RETURN;
 END IF;
 IF nullif(btrim(p_provider_checkout_id),'') IS NULL OR p_checkout_url IS NULL
    OR p_checkout_url !~ '^https://[^/@[:space:]?#]+([/?#][^[:space:]]*)?$' THEN
  RAISE EXCEPTION 'Invalid handoff result';
 END IF;
 IF v_attempt.state IN ('result_ready','finalized') THEN
  IF v_attempt.provider_checkout_id IS DISTINCT FROM p_provider_checkout_id OR v_attempt.checkout_url IS DISTINCT FROM p_checkout_url THEN
   RAISE EXCEPTION 'Handoff result already recorded';
  END IF;
  RETURN;
 END IF;
 UPDATE private.checkout_handoff_attempts SET state='result_ready',provider_checkout_id=p_provider_checkout_id,
  checkout_url=p_checkout_url,failure_code=NULL,result_recorded_at=clock_timestamp() WHERE id=p_attempt_id;
END $$;
CREATE FUNCTION public.record_checkout_handoff_result(p_attempt_id uuid,p_provider_checkout_id text DEFAULT NULL,p_checkout_url text DEFAULT NULL,p_failure_code text DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private.record_checkout_handoff_result_impl(p_attempt_id,p_provider_checkout_id,p_checkout_url,p_failure_code);
$$;

CREATE FUNCTION private.begin_checkout_provider_handoff_impl(p_checkout_session_id uuid,p_provider text,p_provider_checkout_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_uid uuid := (SELECT auth.uid());
 v_session public.checkout_sessions%rowtype;
 v_order public.orders%rowtype;
 v_attempt private.checkout_handoff_attempts%rowtype;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF nullif(btrim(p_provider),'') IS NULL OR nullif(btrim(p_provider_checkout_id),'') IS NULL THEN
  RAISE EXCEPTION 'Provider and checkout id are required';
 END IF;
 SELECT cs.* INTO v_session FROM public.checkout_sessions cs
 WHERE cs.id=p_checkout_session_id AND cs.user_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Checkout session is unavailable or expired'; END IF;
 SELECT o.* INTO v_order FROM public.orders o WHERE o.id=v_session.order_id FOR UPDATE;
 IF NOT FOUND OR v_order.purchaser_user_id IS DISTINCT FROM v_uid
    OR v_order.household_id IS DISTINCT FROM v_session.household_id
    OR NOT private.can_manage_household(v_session.household_id)
    OR v_session.expires_at<=clock_timestamp() THEN
  RAISE EXCEPTION 'Checkout session is unavailable or expired';
 END IF;
 SELECT a.* INTO v_attempt FROM private.checkout_handoff_attempts a WHERE a.checkout_session_id=v_session.id FOR UPDATE;
 IF NOT FOUND OR v_attempt.state NOT IN ('result_ready','finalized')
    OR v_attempt.provider IS DISTINCT FROM p_provider
    OR v_attempt.provider_checkout_id IS DISTINCT FROM p_provider_checkout_id THEN
  RAISE EXCEPTION 'Matching provider result required';
 END IF;
 IF v_attempt.state='finalized' THEN
  IF v_session.status='provider_pending' AND v_order.status='pending_payment'
     AND v_session.payment_provider=p_provider AND v_order.payment_provider=p_provider
     AND v_session.provider_checkout_id=p_provider_checkout_id THEN RETURN; END IF;
  RAISE EXCEPTION 'Checkout session is unavailable or expired';
 END IF;
 IF v_session.status<>'created' OR v_order.status<>'draft'
    OR v_session.payment_provider IS NOT NULL OR v_session.provider_checkout_id IS NOT NULL
    OR v_order.payment_provider IS NOT NULL THEN
  RAISE EXCEPTION 'Checkout session is unavailable or expired';
 END IF;
 UPDATE public.checkout_sessions SET status='provider_pending',payment_provider=p_provider,
  provider_checkout_id=p_provider_checkout_id,updated_at=now() WHERE id=v_session.id;
 UPDATE public.orders SET status='pending_payment',payment_provider=p_provider,updated_at=now() WHERE id=v_order.id;
 UPDATE private.checkout_handoff_attempts SET state='finalized',finalized_at=clock_timestamp() WHERE id=v_attempt.id;
END $$;
CREATE OR REPLACE FUNCTION public.begin_checkout_provider_handoff(p_checkout_session_id uuid,p_provider text,p_provider_checkout_id text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private.begin_checkout_provider_handoff_impl(p_checkout_session_id,p_provider,p_provider_checkout_id);
$$;

REVOKE ALL ON FUNCTION private.claim_checkout_provider_handoff_impl(uuid,text), public.claim_checkout_provider_handoff(uuid,text),
 private.begin_checkout_provider_handoff_impl(uuid,text,text),
 private.record_checkout_handoff_result_impl(uuid,text,text,text),public.record_checkout_handoff_result(uuid,text,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION private.claim_checkout_provider_handoff_impl(uuid,text),public.claim_checkout_provider_handoff(uuid,text),
 private.begin_checkout_provider_handoff_impl(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.record_checkout_handoff_result_impl(uuid,text,text,text),public.record_checkout_handoff_result(uuid,text,text,text) TO service_role;
-- Namespace resolution only: service_role has no grants on the existing private tables/functions.
GRANT USAGE ON SCHEMA private TO service_role;
NOTIFY pgrst,'reload schema';
