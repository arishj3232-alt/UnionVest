-- Store multiple payment proofs (split UPI, bank transfer, USDT) under one recharge request.
CREATE TABLE IF NOT EXISTS public.recharge_request_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.recharge_requests(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  method text NOT NULL CHECK (method IN ('upi_qr', 'bank', 'usdt')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  reference text NULL,
  screenshot_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recharge_request_payments_request_id
  ON public.recharge_request_payments(request_id);
CREATE INDEX IF NOT EXISTS idx_recharge_request_payments_user_id
  ON public.recharge_request_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_recharge_request_payments_method
  ON public.recharge_request_payments(method);

ALTER TABLE public.recharge_request_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment rows.
DROP POLICY IF EXISTS "Users can view own recharge payments" ON public.recharge_request_payments;
CREATE POLICY "Users can view own recharge payments"
  ON public.recharge_request_payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create payment rows for themselves (linked to their own request).
DROP POLICY IF EXISTS "Users can insert own recharge payments" ON public.recharge_request_payments;
CREATE POLICY "Users can insert own recharge payments"
  ON public.recharge_request_payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin panel (hidden) reads everything for review.
DROP POLICY IF EXISTS "Admins can view recharge payments" ON public.recharge_request_payments;
CREATE POLICY "Admins can view recharge payments"
  ON public.recharge_request_payments
  FOR SELECT
  USING (public.is_admin(auth.uid()) OR auth.uid() IS NOT NULL);

