-- Fix recharge status mapping and terminate-order audit record_id type.

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
  v_next_status TEXT;
BEGIN
  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid action. Must be approve or reject';
  END IF;

  v_next_status := CASE
    WHEN p_action = 'approve' THEN 'approved'
    ELSE 'rejected'
  END;

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
    status = v_next_status,
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
    jsonb_build_object('status', v_next_status, 'amount', v_request.amount),
    p_admin_notes
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_terminate_order_early(
  p_admin_id uuid,
  p_order_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.orders
  SET status = 'completed',
      days_remaining = 0,
      completed_at = now()
  WHERE id = p_order_id
    AND status = 'running';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or already completed';
  END IF;

  INSERT INTO public.admin_audit_log (admin_user_id, action, table_name, record_id, new_values, notes)
  SELECT p_admin_id, 'update', 'orders', o.id, jsonb_build_object('status', 'completed', 'days_remaining', 0), p_reason
  FROM public.orders o
  WHERE o.id = p_order_id;
END;
$$;
