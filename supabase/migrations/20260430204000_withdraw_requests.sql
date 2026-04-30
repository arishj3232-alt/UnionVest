-- Withdraw requests: users create a request (funds held), admin can approve/cancel/reject.

CREATE TABLE IF NOT EXISTS public.withdraw_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  tax_rate numeric(6,4) NOT NULL DEFAULT 0.05 CHECK (tax_rate >= 0 AND tax_rate <= 1),
  tax_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  net_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  method text NOT NULL CHECK (method IN ('upi', 'bank')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user_id ON public.withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_status ON public.withdraw_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_created_at ON public.withdraw_requests(created_at DESC);

ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdraw requests.
DROP POLICY IF EXISTS "Users can view own withdraw requests" ON public.withdraw_requests;
CREATE POLICY "Users can view own withdraw requests"
  ON public.withdraw_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Viewer mode: any authenticated user can read all withdraw requests (admin screen).
DROP POLICY IF EXISTS "Authenticated can view all withdraw requests" ON public.withdraw_requests;
CREATE POLICY "Authenticated can view all withdraw requests"
  ON public.withdraw_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Disallow client inserts/updates/deletes; use RPCs only.
DROP POLICY IF EXISTS "Deny client inserts on withdraw_requests" ON public.withdraw_requests;
CREATE POLICY "Deny client inserts on withdraw_requests"
  ON public.withdraw_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client updates on withdraw_requests" ON public.withdraw_requests;
CREATE POLICY "Deny client updates on withdraw_requests"
  ON public.withdraw_requests
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client deletes on withdraw_requests" ON public.withdraw_requests;
CREATE POLICY "Deny client deletes on withdraw_requests"
  ON public.withdraw_requests
  FOR DELETE
  TO authenticated
  USING (false);

-- RPC: user creates request (deducts wallet immediately).
CREATE OR REPLACE FUNCTION public.create_withdraw_request(
  p_amount numeric,
  p_method text,
  p_details jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_tax_rate numeric := 0.05;
  v_tax numeric;
  v_net numeric;
  v_balance numeric;
  v_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  IF p_method NOT IN ('upi', 'bank') THEN
    RAISE EXCEPTION 'Invalid method';
  END IF;

  v_tax := ROUND(p_amount * v_tax_rate, 2);
  v_net := ROUND(p_amount - v_tax, 2);
  IF v_net < 0 THEN v_net := 0; END IF;

  SELECT balance INTO v_balance
  FROM public.profiles
  WHERE user_id = v_actor
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.profiles
  SET balance = balance - p_amount
  WHERE user_id = v_actor;

  INSERT INTO public.withdraw_requests (
    user_id, amount, tax_rate, tax_amount, net_amount, method, details, status
  ) VALUES (
    v_actor, p_amount, v_tax_rate, v_tax, v_net, p_method, COALESCE(p_details, '{}'::jsonb), 'pending'
  ) RETURNING id INTO v_id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, table_name, record_id, new_values, notes)
  VALUES (
    v_actor,
    'withdraw_request_created',
    'withdraw_requests',
    v_id::text,
    jsonb_build_object('amount', p_amount, 'method', p_method, 'status', 'pending'),
    NULL
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_withdraw_request(numeric, text, jsonb) TO authenticated;

-- RPC: admin processes request. On cancel/reject, refund wallet.
CREATE OR REPLACE FUNCTION public.admin_process_withdraw_request(
  p_request_id uuid,
  p_action text,
  p_admin_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_req record;
  v_next text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_action NOT IN ('approve', 'reject', 'cancel') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT * INTO v_req
  FROM public.withdraw_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdraw request not found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;

  v_next := CASE
    WHEN p_action = 'approve' THEN 'approved'
    WHEN p_action = 'reject' THEN 'rejected'
    ELSE 'cancelled'
  END;

  UPDATE public.withdraw_requests
  SET status = v_next,
      admin_notes = p_admin_notes,
      processed_at = now()
  WHERE id = p_request_id;

  IF v_next = 'approved' THEN
    UPDATE public.profiles
    SET total_withdrawal = total_withdrawal + v_req.net_amount
    WHERE user_id = v_req.user_id;
  ELSE
    -- refund gross amount back to wallet
    UPDATE public.profiles
    SET balance = balance + v_req.amount
    WHERE user_id = v_req.user_id;
  END IF;

  INSERT INTO public.admin_audit_log (admin_user_id, action, table_name, record_id, new_values, notes)
  VALUES (
    v_actor,
    'withdraw_' || p_action,
    'withdraw_requests',
    p_request_id::text,
    jsonb_build_object('status', v_next, 'amount', v_req.amount, 'net_amount', v_req.net_amount),
    p_admin_notes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_process_withdraw_request(uuid, text, text) TO authenticated;
