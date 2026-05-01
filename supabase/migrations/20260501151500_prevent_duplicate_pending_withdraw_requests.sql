-- Prevent duplicate pending withdraw requests from rapid repeated clicks.
-- Keeps admin workflow clean (one pending request per user at a time).

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

  IF EXISTS (
    SELECT 1
    FROM public.withdraw_requests
    WHERE user_id = v_actor
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a pending withdrawal request. Please wait for admin review.';
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
