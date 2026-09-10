CREATE TYPE public.card_fulfillment_status AS ENUM ('requested','printing','shipped','delivered','cancelled');

CREATE TABLE public.card_fulfillment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  address_street text NOT NULL,
  address_street2 text,
  address_city text NOT NULL,
  address_state text NOT NULL,
  address_zip text NOT NULL,
  address_country text NOT NULL DEFAULT 'US',
  note text,
  status public.card_fulfillment_status NOT NULL DEFAULT 'requested',
  shipped_at timestamptz,
  tracking_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_fulfillment_requests TO authenticated;
GRANT ALL ON public.card_fulfillment_requests TO service_role;

ALTER TABLE public.card_fulfillment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own card requests read" ON public.card_fulfillment_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.pool_members pm
      WHERE pm.user_id = card_fulfillment_requests.user_id
        AND public.is_pool_owner(pm.pool_id, auth.uid())
    )
  );

CREATE POLICY "own card requests insert" ON public.card_fulfillment_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "own card requests update" ON public.card_fulfillment_requests
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.pool_members pm
      WHERE pm.user_id = card_fulfillment_requests.user_id
        AND public.is_pool_owner(pm.pool_id, auth.uid())
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.pool_members pm
      WHERE pm.user_id = card_fulfillment_requests.user_id
        AND public.is_pool_owner(pm.pool_id, auth.uid())
    )
  );

CREATE POLICY "own card requests delete" ON public.card_fulfillment_requests
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX card_fulfillment_requests_user_idx ON public.card_fulfillment_requests (user_id, created_at DESC);

CREATE TRIGGER card_fulfillment_requests_touch
  BEFORE UPDATE ON public.card_fulfillment_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.activate_tracking_by_pin(_pin text, _caller text DEFAULT NULL::text, _activation_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _row public.holder_activations; _name text;
BEGIN
  SELECT * INTO _row FROM public.holder_activations WHERE pin = _pin;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'PIN not recognized');
  END IF;

  IF _activation_code IS NOT NULL AND _activation_code <> ''
     AND upper(btrim(_activation_code)) <> upper(_row.activation_code) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Activation code does not match PIN');
  END IF;

  UPDATE public.holder_activations
     SET tracking_active = true, activated_at = now(), activated_via = 'phone'
   WHERE user_id = _row.user_id
  RETURNING * INTO _row;

  SELECT full_name INTO _name FROM public.profiles WHERE id = _row.user_id;

  INSERT INTO public.activation_events (user_id, event_type, method, detail)
  VALUES (_row.user_id, 'activated', 'phone',
          COALESCE('Activated by phone call from ' || _caller, 'Activated by phone call')
          || CASE WHEN _activation_code IS NOT NULL AND _activation_code <> ''
                  THEN ' (card code verified)' ELSE '' END);

  RETURN jsonb_build_object('ok', true, 'holder_name', _name, 'activated_at', _row.activated_at);
END; $function$;

REVOKE ALL ON FUNCTION public.activate_tracking_by_pin(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_tracking_by_pin(text, text, text) TO service_role;
DROP FUNCTION IF EXISTS public.activate_tracking_by_pin(text, text);