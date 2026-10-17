CREATE TABLE public.card_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fulfillment_request_id UUID REFERENCES public.card_fulfillment_requests(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('print', 'email', 'physical')),
  amount_cents INTEGER NOT NULL DEFAULT 200 CHECK (amount_cents = 200),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'refunded')),
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  receipt_reference TEXT NOT NULL DEFAULT ('BB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  processor TEXT NOT NULL DEFAULT 'simulated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.card_payments TO authenticated;
GRANT ALL ON public.card_payments TO service_role;

ALTER TABLE public.card_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Holders read own card payments"
  ON public.card_payments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Holders insert own card payments"
  ON public.card_payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX card_payments_user_idx ON public.card_payments (user_id, created_at DESC);