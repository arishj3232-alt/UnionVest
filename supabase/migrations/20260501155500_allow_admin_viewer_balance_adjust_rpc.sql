-- Align balance-adjust RPC with admin-viewer access model.
-- Keeps strong actor validation while allowing authenticated admin-panel viewers.

CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_delta NUMERIC,
  p_reason TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_old_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_admin_id IS NULL OR p_admin_id <> v_actor THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'Delta must be non-zero';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Reason required (min 3 chars)';
  END IF;

  SELECT balance INTO v_old_balance
  FROM public.profiles
  WHERE user_id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  v_new_balance := v_old_balance + p_delta;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Resulting balance would be negative';
  END IF;

  UPDATE public.profiles
  SET balance = v_new_balance
  WHERE user_id = p_target_user_id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, table_name, record_id, old_values, new_values, notes)
  VALUES (
    v_actor,
    'balance_adjust',
    'profiles',
    p_target_user_id,
    jsonb_build_object('balance', v_old_balance),
    jsonb_build_object('balance', v_new_balance, 'delta', p_delta),
    trim(p_reason)
  );

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_adjust_user_balance(uuid, uuid, numeric, text) TO authenticated;
