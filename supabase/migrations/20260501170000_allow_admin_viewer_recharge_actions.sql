-- Align recharge admin actions with "admin viewer" access model.
-- Allow any authenticated user to process recharge requests from the
-- hotkey-gated Admin Panel flow, while still enforcing actor identity checks.

CREATE OR REPLACE FUNCTION public.process_recharge_request(
  p_request_id uuid,
  p_action text,
  p_admin_id uuid,
  p_admin_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_request record;
  v_next_status text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_admin_id IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Admin mismatch';
  END IF;
  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid action. Must be approve or reject';
  END IF;

  v_next_status := CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END;

  SELECT * INTO v_request
  FROM public.recharge_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recharge request not found';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;

  UPDATE public.recharge_requests
  SET
    status = v_next_status,
    admin_notes = p_admin_notes,
    processed_at = now()
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
    v_actor,
    'recharge_' || p_action,
    'recharge_requests',
    p_request_id,
    jsonb_build_object('status', v_next_status, 'amount', v_request.amount),
    p_admin_notes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_recharge_request(uuid, text, uuid, text) TO authenticated;
