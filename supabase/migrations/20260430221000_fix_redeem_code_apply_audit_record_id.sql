-- Fix redeem RPC: admin_audit_log.record_id is UUID, not text.

CREATE OR REPLACE FUNCTION public.redeem_code_apply(p_code text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_code record;
  v_claims int;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RAISE EXCEPTION 'Code required';
  END IF;

  SELECT *
  INTO v_code
  FROM public.redeem_codes
  WHERE upper(code) = upper(trim(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid redeem code';
  END IF;
  IF NOT v_code.is_active THEN
    RAISE EXCEPTION 'Redeem code is inactive';
  END IF;

  SELECT COUNT(*)::int INTO v_claims
  FROM public.redeem_claims
  WHERE code_id = v_code.id;

  IF v_claims >= v_code.max_claims THEN
    RAISE EXCEPTION 'Redeem limit reached';
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

  RETURN v_code.reward_amount;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Code already used on this account';
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_code_apply(text) TO authenticated;
