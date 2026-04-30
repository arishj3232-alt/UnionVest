-- Redeem admin visibility and control enhancements.

CREATE OR REPLACE FUNCTION public.admin_list_redeem_claims()
RETURNS TABLE (
  claim_id uuid,
  code_id uuid,
  code text,
  user_id uuid,
  user_nickname text,
  user_phone text,
  amount numeric,
  claimed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rc.id AS claim_id,
    rc.code_id,
    r.code,
    rc.user_id,
    COALESCE(p.nickname, 'Unknown') AS user_nickname,
    COALESCE(p.phone, '') AS user_phone,
    rc.amount,
    rc.created_at AS claimed_at
  FROM public.redeem_claims rc
  JOIN public.redeem_codes r
    ON r.id = rc.code_id
  LEFT JOIN public.profiles p
    ON p.user_id = rc.user_id
  WHERE public.is_admin(auth.uid())
  ORDER BY rc.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_redeem_claims() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_redeem_code(p_code_id uuid)
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

  DELETE FROM public.redeem_codes
  WHERE id = p_code_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_redeem_code(uuid) TO authenticated;
