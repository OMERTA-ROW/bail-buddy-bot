
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  notify_sms BOOLEAN NOT NULL DEFAULT false,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile all" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- tracked_inmates
CREATE TYPE public.inmate_status AS ENUM (
  'searching', 'in_custody', 'bond_set', 'bond_posted', 'released', 'transferred', 'not_found'
);

CREATE TABLE public.tracked_inmates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  county TEXT NOT NULL,
  state TEXT NOT NULL,
  booking_number TEXT,
  status public.inmate_status NOT NULL DEFAULT 'searching',
  bond_amount_cents BIGINT,
  charges TEXT,
  notes TEXT,
  facility_name TEXT,
  auto_refer_bondsman BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tracked_inmates (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracked_inmates TO authenticated;
GRANT ALL ON public.tracked_inmates TO service_role;
ALTER TABLE public.tracked_inmates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inmates all" ON public.tracked_inmates FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- status_events
CREATE TABLE public.status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inmate_id UUID NOT NULL REFERENCES public.tracked_inmates(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  bond_amount_cents BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.status_events (inmate_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_events TO authenticated;
GRANT ALL ON public.status_events TO service_role;
ALTER TABLE public.status_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inmate events all" ON public.status_events FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tracked_inmates ti WHERE ti.id = inmate_id AND ti.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tracked_inmates ti WHERE ti.id = inmate_id AND ti.user_id = auth.uid()));

-- bondsmen (public directory, owner-editable)
CREATE TABLE public.bondsmen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agency_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  license_number TEXT NOT NULL,
  license_state TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  counties_served TEXT[] NOT NULL DEFAULT '{}',
  states_served TEXT[] NOT NULL DEFAULT '{}',
  hours_247 BOOLEAN NOT NULL DEFAULT true,
  premium_rate_pct NUMERIC(4,2) NOT NULL DEFAULT 10.0,
  bio TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bondsmen TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bondsmen TO authenticated;
GRANT ALL ON public.bondsmen TO service_role;
ALTER TABLE public.bondsmen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bondsmen public read" ON public.bondsmen FOR SELECT USING (true);
CREATE POLICY "bondsmen owner insert" ON public.bondsmen FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bondsmen owner update" ON public.bondsmen FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bondsmen owner delete" ON public.bondsmen FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- shared timestamp trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_inmates_updated BEFORE UPDATE ON public.tracked_inmates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_bondsmen_updated BEFORE UPDATE ON public.bondsmen
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
