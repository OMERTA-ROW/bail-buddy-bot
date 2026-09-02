
-- ============ enums ============
CREATE TYPE public.pool_role AS ENUM ('owner', 'member');
CREATE TYPE public.payout_source AS ENUM ('pool', 'personal_card');
CREATE TYPE public.payout_status AS ENUM ('pending', 'authorized', 'routed_to_agent', 'completed', 'failed', 'cancelled');

-- ============ funding_pools ============
CREATE TABLE public.funding_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Main funding account',
  owner_id uuid NOT NULL,
  balance_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  allow_card_fallback boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT funding_pools_balance_nonneg CHECK (balance_cents >= 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_pools TO authenticated;
GRANT ALL ON public.funding_pools TO service_role;
ALTER TABLE public.funding_pools ENABLE ROW LEVEL SECURITY;

-- ============ pool_members ============
CREATE TABLE public.pool_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES public.funding_pools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.pool_role NOT NULL DEFAULT 'member',
  can_draw boolean NOT NULL DEFAULT false,
  spend_limit_cents bigint,
  card_fallback_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pool_id, user_id),
  CONSTRAINT pool_members_limit_nonneg CHECK (spend_limit_cents IS NULL OR spend_limit_cents >= 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pool_members TO authenticated;
GRANT ALL ON public.pool_members TO service_role;
ALTER TABLE public.pool_members ENABLE ROW LEVEL SECURITY;

-- ============ security definer helpers (avoid RLS recursion) ============
CREATE OR REPLACE FUNCTION public.is_pool_member(_pool_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pool_members WHERE pool_id = _pool_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_pool_owner(_pool_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pool_members
    WHERE pool_id = _pool_id AND user_id = _user_id AND role = 'owner'
  ) OR EXISTS (
    SELECT 1 FROM public.funding_pools WHERE id = _pool_id AND owner_id = _user_id
  );
$$;

-- ============ funding_pools policies ============
CREATE POLICY "pool members read pool" ON public.funding_pools
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_pool_member(id, auth.uid()));

CREATE POLICY "users create own pool" ON public.funding_pools
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "pool owner updates pool" ON public.funding_pools
  FOR UPDATE TO authenticated
  USING (public.is_pool_owner(id, auth.uid()))
  WITH CHECK (public.is_pool_owner(id, auth.uid()));

CREATE POLICY "pool owner deletes pool" ON public.funding_pools
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ============ pool_members policies ============
CREATE POLICY "members read roster" ON public.pool_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_pool_member(pool_id, auth.uid()));

CREATE POLICY "owner adds members" ON public.pool_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pool_owner(pool_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.funding_pools p WHERE p.id = pool_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "owner updates members" ON public.pool_members
  FOR UPDATE TO authenticated
  USING (public.is_pool_owner(pool_id, auth.uid()))
  WITH CHECK (public.is_pool_owner(pool_id, auth.uid()));

CREATE POLICY "member updates own consent" ON public.pool_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner removes members" ON public.pool_members
  FOR DELETE TO authenticated
  USING (public.is_pool_owner(pool_id, auth.uid()) OR user_id = auth.uid());

-- ============ pool_contributions ============
CREATE TABLE public.pool_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES public.funding_pools(id) ON DELETE CASCADE,
  contributor_id uuid NOT NULL,
  amount_cents bigint NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pool_contributions_amount_pos CHECK (amount_cents > 0)
);
GRANT SELECT, INSERT ON public.pool_contributions TO authenticated;
GRANT ALL ON public.pool_contributions TO service_role;
ALTER TABLE public.pool_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read contributions" ON public.pool_contributions
  FOR SELECT TO authenticated USING (public.is_pool_member(pool_id, auth.uid()));

CREATE POLICY "members add contributions" ON public.pool_contributions
  FOR INSERT TO authenticated
  WITH CHECK (contributor_id = auth.uid() AND public.is_pool_member(pool_id, auth.uid()));

-- ============ payment_methods (tokenized only, never raw PAN) ============
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text,
  brand text NOT NULL,
  last4 text NOT NULL,
  exp_month smallint NOT NULL,
  exp_year smallint NOT NULL,
  processor text NOT NULL DEFAULT 'unlinked',
  processor_token text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_methods_last4_fmt CHECK (last4 ~ '^[0-9]{4}$'),
  CONSTRAINT payment_methods_exp_month_range CHECK (exp_month BETWEEN 1 AND 12),
  CONSTRAINT payment_methods_exp_year_range CHECK (exp_year BETWEEN 2000 AND 2100)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own payment methods" ON public.payment_methods
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE UNIQUE INDEX payment_methods_one_default_per_user
  ON public.payment_methods (user_id) WHERE is_default;

-- ============ disbursements ============
CREATE TABLE public.disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid REFERENCES public.funding_pools(id) ON DELETE SET NULL,
  inmate_id uuid REFERENCES public.tracked_inmates(id) ON DELETE SET NULL,
  initiated_by uuid NOT NULL,
  amount_cents bigint NOT NULL,
  source public.payout_source NOT NULL DEFAULT 'pool',
  payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  status public.payout_status NOT NULL DEFAULT 'pending',
  routed_bondsman_id uuid REFERENCES public.bondsmen(id) ON DELETE SET NULL,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT disbursements_amount_pos CHECK (amount_cents > 0)
);
GRANT SELECT, INSERT, UPDATE ON public.disbursements TO authenticated;
GRANT ALL ON public.disbursements TO service_role;
ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read disbursements" ON public.disbursements
  FOR SELECT TO authenticated
  USING (
    initiated_by = auth.uid()
    OR (pool_id IS NOT NULL AND public.is_pool_member(pool_id, auth.uid()))
  );

CREATE POLICY "members create disbursements" ON public.disbursements
  FOR INSERT TO authenticated
  WITH CHECK (
    initiated_by = auth.uid()
    AND (pool_id IS NULL OR public.is_pool_member(pool_id, auth.uid()))
  );

CREATE POLICY "owner updates disbursements" ON public.disbursements
  FOR UPDATE TO authenticated
  USING (initiated_by = auth.uid() OR (pool_id IS NOT NULL AND public.is_pool_owner(pool_id, auth.uid())))
  WITH CHECK (initiated_by = auth.uid() OR (pool_id IS NOT NULL AND public.is_pool_owner(pool_id, auth.uid())));

-- ============ link inmates to a funding pool ============
ALTER TABLE public.tracked_inmates
  ADD COLUMN funding_pool_id uuid REFERENCES public.funding_pools(id) ON DELETE SET NULL;

-- ============ owner auto-membership ============
CREATE OR REPLACE FUNCTION public.add_pool_owner_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.pool_members (pool_id, user_id, role, can_draw, card_fallback_consent)
  VALUES (NEW.id, NEW.owner_id, 'owner', true, false)
  ON CONFLICT (pool_id, user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER funding_pools_owner_membership
AFTER INSERT ON public.funding_pools
FOR EACH ROW EXECUTE FUNCTION public.add_pool_owner_membership();

-- ============ updated_at triggers ============
CREATE TRIGGER touch_funding_pools BEFORE UPDATE ON public.funding_pools
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_pool_members BEFORE UPDATE ON public.pool_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_payment_methods BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_disbursements BEFORE UPDATE ON public.disbursements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_pool_members_user ON public.pool_members (user_id);
CREATE INDEX idx_contributions_pool ON public.pool_contributions (pool_id, created_at DESC);
CREATE INDEX idx_disbursements_pool ON public.disbursements (pool_id, created_at DESC);
