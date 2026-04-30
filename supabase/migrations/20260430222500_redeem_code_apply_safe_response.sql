-- Return safe JSON response for redeem apply to avoid noisy 400s for business-rule failures.

CREATE OR REPLACE FUNCTION public.redeem_code_apply_safe(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_code record;
  v_claims int;
  v_already_used boolean;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'amount', 0, 'message', 'Unauthorized');
  END IF;
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'amount', 0, 'message', 'Code required');
  END IF;

  SELECT *
  INTO v_code
  FROM public.redeem_codes
  WHERE upper(code) = upper(trim(p_code))
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'amount', 0, 'message', 'Invalid redeem code');
  END IF;
  IF NOT v_code.is_active THEN
    RETURN jsonb_build_object('ok', false, 'amount', 0, 'message', 'Redeem code is inactive');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.redeem_claims
    WHERE code_id = v_code.id
      AND user_id = v_actor
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN jsonb_build_object('ok', false, 'amount', 0, 'message', 'Code already used on this account');
  END IF;

  SELECT COUNT(*)::int
  INTO v_claims
  FROM public.redeem_claims
  WHERE code_id = v_code.id;

  IF v_claims >= v_code.max_claims THEN
    RETURN jsonb_build_object('ok', false, 'amount', 0, 'message', 'Redeem limit reached');
  END IF;

  INSERT INTO public.redeem_claims (code_id, user_id, amount)
  VALUES (v_code.id, v_actor, v_code.reward_amount);

  UPDATE public.profiles
  SET balance = balance + v_code.reward_amount
  WHERE user_id = v_actor;

  INSERT INTO public.admin_audit_log (admin_user_id, action, table_name, record_id, new_values, notes)
  VALUES (
    v_actor,
    'redeem_claim',
    'redeem_codes',
    v_code.id,
    jsonb_build_object('code', v_code.code, 'amount', v_code.reward_amount),
    'User applied redeem code'
  );

  RETURN jsonb_build_object('ok', true, 'amount', v_code.reward_amount, 'message', 'Redeem success');
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_code_apply_safe(text) TO authenticated;
