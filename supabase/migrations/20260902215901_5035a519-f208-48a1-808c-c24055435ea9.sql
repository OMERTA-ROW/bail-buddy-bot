
CREATE OR REPLACE FUNCTION public.contribute_to_pool(_pool_id uuid, _amount_cents bigint, _note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents IS NULL OR _amount_cents <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF NOT public.is_pool_member(_pool_id, _uid) THEN RAISE EXCEPTION 'Not a member of this account'; END IF;

  INSERT INTO public.pool_contributions (pool_id, contributor_id, amount_cents, note)
  VALUES (_pool_id, _uid, _amount_cents, _note)
  RETURNING id INTO _id;

  UPDATE public.funding_pools
     SET balance_cents = balance_cents + _amount_cents
   WHERE id = _pool_id;

  RETURN _id;
END; $$;

REVOKE ALL ON FUNCTION public.contribute_to_pool(uuid, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contribute_to_pool(uuid, bigint, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_disbursement(_inmate_id uuid, _amount_cents bigint)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _inmate public.tracked_inmates%ROWTYPE;
  _pool public.funding_pools%ROWTYPE;
  _mem public.pool_members%ROWTYPE;
  _pm_id uuid;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents IS NULL OR _amount_cents <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT * INTO _inmate FROM public.tracked_inmates WHERE id = _inmate_id AND user_id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tracked person not found'; END IF;

  IF _inmate.funding_pool_id IS NOT NULL THEN
    SELECT * INTO _pool FROM public.funding_pools WHERE id = _inmate.funding_pool_id FOR UPDATE;
    SELECT * INTO _mem FROM public.pool_members
      WHERE pool_id = _inmate.funding_pool_id AND user_id = _uid;
  END IF;

  -- 1) shared pool
  IF _pool.id IS NOT NULL AND _mem.id IS NOT NULL AND _mem.can_draw
     AND (_mem.spend_limit_cents IS NULL OR _amount_cents <= _mem.spend_limit_cents)
     AND _pool.balance_cents >= _amount_cents
  THEN
    UPDATE public.funding_pools SET balance_cents = balance_cents - _amount_cents WHERE id = _pool.id;
    INSERT INTO public.disbursements (pool_id, inmate_id, initiated_by, amount_cents, source, status)
    VALUES (_pool.id, _inmate_id, _uid, _amount_cents, 'pool', 'authorized')
    RETURNING id INTO _id;
    RETURN _id;
  END IF;

  -- 2) personal card fallback (requires explicit consent)
  SELECT id INTO _pm_id FROM public.payment_methods
   WHERE user_id = _uid AND is_default LIMIT 1;

  IF _pm_id IS NOT NULL AND _mem.id IS NOT NULL AND _mem.card_fallback_consent
     AND (_pool.id IS NULL OR _pool.allow_card_fallback)
  THEN
    INSERT INTO public.disbursements (pool_id, inmate_id, initiated_by, amount_cents, source, payment_method_id, status)
    VALUES (_pool.id, _inmate_id, _uid, _amount_cents, 'personal_card', _pm_id, 'authorized')
    RETURNING id INTO _id;
    RETURN _id;
  END IF;

  -- 3) nothing available
  INSERT INTO public.disbursements (pool_id, inmate_id, initiated_by, amount_cents, source, status, failure_reason)
  VALUES (
    _pool.id, _inmate_id, _uid, _amount_cents, 'pool', 'failed',
    CASE
      WHEN _pool.id IS NULL THEN 'No funding account linked to this person'
      WHEN _mem.id IS NULL THEN 'You are not a member of the linked funding account'
      WHEN NOT _mem.can_draw THEN 'You are not permitted to draw from the shared account'
      WHEN _mem.spend_limit_cents IS NOT NULL AND _amount_cents > _mem.spend_limit_cents
        THEN 'Amount exceeds your spending limit'
      WHEN _pool.balance_cents < _amount_cents THEN 'Shared account balance is short and no consented backup card is on file'
      ELSE 'No available funding source'
    END
  )
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

REVOKE ALL ON FUNCTION public.request_disbursement(uuid, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_disbursement(uuid, bigint) TO authenticated;
