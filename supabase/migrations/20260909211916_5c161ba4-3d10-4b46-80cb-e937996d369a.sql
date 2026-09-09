-- 1. Call-in number on the funding account
ALTER TABLE public.funding_pools ADD COLUMN IF NOT EXISTS call_in_number text;

-- 2. Code generators
CREATE OR REPLACE FUNCTION public.gen_activation_code()
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
BEGIN
  FOR i IN 1..10 LOOP
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN out;
END; $$;

CREATE OR REPLACE FUNCTION public.gen_activation_pin()
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE p text;
BEGIN
  LOOP
    p := lpad(floor(random() * 1000000)::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.holder_activations WHERE pin = p);
  END LOOP;
  RETURN p;
END; $$;

-- 3. Holder activation records
CREATE TABLE IF NOT EXISTS public.holder_activations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  activation_code text NOT NULL UNIQUE,
  pin text NOT NULL UNIQUE,
  tracking_active boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  activated_via text,
  deactivated_at timestamptz,
  card_printed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.holder_activations TO authenticated;
GRANT ALL ON public.holder_activations TO service_role;
ALTER TABLE public.holder_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own activation read" ON public.holder_activations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.pool_members pm
      WHERE pm.user_id = public.holder_activations.user_id
        AND public.is_pool_owner(pm.pool_id, auth.uid())
    )
  );

CREATE POLICY "own activation update" ON public.holder_activations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER touch_holder_activations
  BEFORE UPDATE ON public.holder_activations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Activation event log
CREATE TABLE IF NOT EXISTS public.activation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  method text NOT NULL DEFAULT 'app',
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activation_events_user_idx
  ON public.activation_events (user_id, created_at DESC);

GRANT SELECT ON public.activation_events TO authenticated;
GRANT ALL ON public.activation_events TO service_role;
ALTER TABLE public.activation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own activation events read" ON public.activation_events
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.pool_members pm
      WHERE pm.user_id = public.activation_events.user_id
        AND public.is_pool_owner(pm.pool_id, auth.uid())
    )
  );

-- 5. Ensure every holder has a record (new + existing)
CREATE OR REPLACE FUNCTION public.ensure_holder_activation(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.holder_activations (user_id, activation_code, pin)
  VALUES (_user_id, public.gen_activation_code(), public.gen_activation_pin())
  ON CONFLICT (user_id) DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  PERFORM public.ensure_holder_activation(NEW.id);
  RETURN NEW;
END; $$;

INSERT INTO public.holder_activations (user_id, activation_code, pin)
SELECT u.id, public.gen_activation_code(), public.gen_activation_pin()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.holder_activations h WHERE h.user_id = u.id);

-- 6. Regenerate my code / PIN
CREATE OR REPLACE FUNCTION public.regenerate_activation_code()
RETURNS public.holder_activations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.holder_activations;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.ensure_holder_activation(_uid);
  UPDATE public.holder_activations
     SET activation_code = public.gen_activation_code(),
         pin = public.gen_activation_pin()
   WHERE user_id = _uid
  RETURNING * INTO _row;

  INSERT INTO public.activation_events (user_id, event_type, method, detail)
  VALUES (_uid, 'code_regenerated', 'app', 'New activation code and PIN issued');

  RETURN _row;
END; $$;

REVOKE ALL ON FUNCTION public.regenerate_activation_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_activation_code() TO authenticated;

-- 7. Turn tracking on/off from the app
CREATE OR REPLACE FUNCTION public.set_tracking_active(_active boolean)
RETURNS public.holder_activations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.holder_activations;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.ensure_holder_activation(_uid);
  UPDATE public.holder_activations
     SET tracking_active = _active,
         activated_at = CASE WHEN _active THEN now() ELSE activated_at END,
         activated_via = CASE WHEN _active THEN 'app' ELSE activated_via END,
         deactivated_at = CASE WHEN _active THEN deactivated_at ELSE now() END
   WHERE user_id = _uid
  RETURNING * INTO _row;

  INSERT INTO public.activation_events (user_id, event_type, method, detail)
  VALUES (_uid, CASE WHEN _active THEN 'activated' ELSE 'deactivated' END, 'app',
          CASE WHEN _active THEN 'Tracking activated in the app' ELSE 'Tracking paused in the app' END);

  RETURN _row;
END; $$;

REVOKE ALL ON FUNCTION public.set_tracking_active(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_tracking_active(boolean) TO authenticated;

-- 8. Phone activation by PIN — server only
CREATE OR REPLACE FUNCTION public.activate_tracking_by_pin(_pin text, _caller text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.holder_activations; _name text;
BEGIN
  SELECT * INTO _row FROM public.holder_activations WHERE pin = _pin;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'PIN not recognized');
  END IF;

  UPDATE public.holder_activations
     SET tracking_active = true, activated_at = now(), activated_via = 'phone'
   WHERE user_id = _row.user_id
  RETURNING * INTO _row;

  SELECT full_name INTO _name FROM public.profiles WHERE id = _row.user_id;

  INSERT INTO public.activation_events (user_id, event_type, method, detail)
  VALUES (_row.user_id, 'activated', 'phone',
          COALESCE('Activated by phone call from ' || _caller, 'Activated by phone call'));

  RETURN jsonb_build_object('ok', true, 'holder_name', _name, 'activated_at', _row.activated_at);
END; $$;

REVOKE ALL ON FUNCTION public.activate_tracking_by_pin(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_tracking_by_pin(text, text) TO service_role;