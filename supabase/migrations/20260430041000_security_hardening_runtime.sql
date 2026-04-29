-- Runtime security hardening + permission reliability fixes.

-- 1) Tighten recharge_request_payments policies.
DROP POLICY IF EXISTS "Admins can view recharge payments" ON public.recharge_request_payments;
CREATE POLICY "Admins can view recharge payments"
  ON public.recharge_request_payments
  FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own recharge payments" ON public.recharge_request_payments;
CREATE POLICY "Users can insert own recharge payments"
  ON public.recharge_request_payments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.recharge_requests rr
      WHERE rr.id = request_id
        AND rr.user_id = auth.uid()
    )
  );

-- 2) Ensure admin RPC validates caller identity (not only caller-provided params).
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
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_admin_id IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Admin mismatch';
  END IF;
  IF NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
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
    v_actor,
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
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_admin_id IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Admin mismatch';
  END IF;
  IF NOT public.is_admin(v_actor) THEN
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
  SELECT v_actor, 'update', 'orders', o.id, jsonb_build_object('status', 'completed', 'days_remaining', 0), p_reason
  FROM public.orders o
  WHERE o.id = p_order_id;
END;
$$;

-- 3) Ensure authenticated clients can execute intended RPCs; role checks remain in-function.
GRANT EXECUTE ON FUNCTION public.process_recharge_request(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_terminate_order_early(uuid, uuid, text) TO authenticated;
