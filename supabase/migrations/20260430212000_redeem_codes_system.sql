-- Redeem codes system.

CREATE TABLE IF NOT EXISTS public.redeem_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  reward_amount numeric(12,2) NOT NULL CHECK (reward_amount > 0),
  max_claims int NOT NULL CHECK (max_claims > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.redeem_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.redeem_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_redeem_claims_code_id ON public.redeem_claims(code_id);
CREATE INDEX IF NOT EXISTS idx_redeem_claims_user_id ON public.redeem_claims(user_id);

ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redeem_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view own redeem claims" ON public.redeem_claims;
CREATE POLICY "Authenticated can view own redeem claims"
  ON public.redeem_claims
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Deny client writes on redeem_codes" ON public.redeem_codes;
CREATE POLICY "Deny client writes on redeem_codes"
  ON public.redeem_codes
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client writes on redeem_claims" ON public.redeem_claims;
CREATE POLICY "Deny client writes on redeem_claims"
  ON public.redeem_claims
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- User redeem flow.
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
    v_code.id::text,
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

-- Admin create code.
CREATE OR REPLACE FUNCTION public.admin_create_redeem_code(
  p_code text,
  p_reward_amount numeric,
  p_max_claims int,
  p_is_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_code IS NULL OR length(trim(p_code)) < 3 THEN
    RAISE EXCEPTION 'Invalid code';
  END IF;
  IF p_reward_amount IS NULL OR p_reward_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid reward amount';
  END IF;
  IF p_max_claims IS NULL OR p_max_claims <= 0 THEN
    RAISE EXCEPTION 'Invalid max claims';
  END IF;

  INSERT INTO public.redeem_codes (code, reward_amount, max_claims, is_active, created_by)
  VALUES (upper(trim(p_code)), p_reward_amount, p_max_claims, COALESCE(p_is_active, true), v_actor)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_redeem_code(text, numeric, int, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_redeem_codes()
RETURNS TABLE (
  id uuid,
  code text,
  reward_amount numeric,
  max_claims int,
  claims_used bigint,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rc.id,
    rc.code,
    rc.reward_amount,
    rc.max_claims,
    COALESCE(c.claims_used, 0) AS claims_used,
    rc.is_active,
    rc.created_at
  FROM public.redeem_codes rc
  LEFT JOIN (
    SELECT code_id, COUNT(*)::bigint AS claims_used
    FROM public.redeem_claims
    GROUP BY code_id
  ) c ON c.code_id = rc.id
  WHERE public.is_admin(auth.uid())
  ORDER BY rc.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_redeem_codes() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_redeem_code_active(
  p_code_id uuid,
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.redeem_codes
  SET is_active = p_is_active
  WHERE id = p_code_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_redeem_code_active(uuid, boolean) TO authenticated;

INSERT INTO public.redeem_codes (code, reward_amount, max_claims, is_active)
VALUES ('UNIONVEST100', 100, 100, true)
ON CONFLICT (code) DO NOTHING;
