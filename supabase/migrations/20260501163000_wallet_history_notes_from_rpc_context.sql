-- Add source/note propagation into wallet_history from RPC context.
-- Allows admin notes to appear in wallet history rows.

CREATE OR REPLACE FUNCTION public.log_wallet_history_on_balance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta numeric(12,2);
  v_note text := NULLIF(current_setting('app.wallet_note', true), '');
  v_source text := COALESCE(NULLIF(current_setting('app.wallet_source', true), ''), 'profile_balance_update');
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.balance IS DISTINCT FROM OLD.balance THEN
    v_delta := ROUND(NEW.balance - OLD.balance, 2);
    INSERT INTO public.wallet_history (
      user_id,
      delta,
      balance_before,
      balance_after,
      source,
      note,
      changed_by
    )
    VALUES (
      NEW.user_id,
      v_delta,
      OLD.balance,
      NEW.balance,
      v_source,
      v_note,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

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

  PERFORM set_config('app.wallet_source', 'admin_adjust_balance', true);
  PERFORM set_config('app.wallet_note', trim(p_reason), true);

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
  v_note text := COALESCE(NULLIF(trim(COALESCE(p_admin_notes, '')), ''), 'withdraw_' || p_action);
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
    PERFORM set_config('app.wallet_source', 'withdraw_approved', true);
    PERFORM set_config('app.wallet_note', v_note, true);
    UPDATE public.profiles
    SET total_withdrawal = total_withdrawal + v_req.net_amount
    WHERE user_id = v_req.user_id;
  ELSE
    PERFORM set_config('app.wallet_source', 'withdraw_refund', true);
    PERFORM set_config('app.wallet_note', v_note, true);
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
