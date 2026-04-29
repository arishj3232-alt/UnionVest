-- Allow any authenticated user (passing a valid auth uid) to process recharge
-- from the hidden admin panel workflow.
CREATE OR REPLACE FUNCTION public.process_recharge_request(
  p_request_id UUID,
  p_action TEXT,
  p_admin_id UUID,
  p_admin_notes TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid action. Must be approve or reject';
  END IF;

  SELECT * INTO v_request
  FROM public.recharge_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recharge request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;

  UPDATE public.recharge_requests
  SET
    status = p_action || 'd',
    admin_notes = p_admin_notes,
    processed_at = NOW()
  WHERE id = p_request_id;

  IF p_action = 'approve' THEN
    UPDATE public.profiles
    SET
      balance = balance + v_request.amount,
      total_recharge = total_recharge + v_request.amount
    WHERE user_id = v_request.user_id;
  END IF;

  INSERT INTO public.admin_audit_log (
    admin_user_id, action, table_name, record_id, new_values, notes
  ) VALUES (
    p_admin_id,
    'recharge_' || p_action,
    'recharge_requests',
    p_request_id,
    jsonb_build_object('status', p_action || 'd', 'amount', v_request.amount),
    p_admin_notes
  );
END;
$$;
