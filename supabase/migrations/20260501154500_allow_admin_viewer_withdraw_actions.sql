-- Align withdraw admin actions with "admin viewer" access model.
-- If user can open Admin Panel (hotkey-gated client flow), allow RPC actions
-- for any authenticated session instead of strict is_admin role check.

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
    UPDATE public.profiles
    SET balance = balance + v_req.amount
    WHERE user_id = v_req.user_id;
  END IF;

  INSERT INTO public.admin_audit_log (admin_user_id, action, table_name, record_id, new_values, notes)
  VALUES (
    v_actor,
    'withdraw_' || p_action,
    'withdraw_requests',
    p_request_id,
    jsonb_build_object('status', v_next, 'amount', v_req.amount, 'net_amount', v_req.net_amount),
    p_admin_notes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_process_withdraw_request(uuid, text, text) TO authenticated;
