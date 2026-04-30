-- Update admin_user_metrics after withdraw_requests exists.
DROP FUNCTION IF EXISTS public.admin_user_metrics();

CREATE OR REPLACE FUNCTION public.admin_user_metrics()
RETURNS TABLE (
  user_id uuid,
  nickname text,
  phone text,
  disabled_at timestamptz,
  balance numeric,
  total_recharge numeric,
  total_withdrawal numeric,
  total_investment numeric,
  total_earned numeric,
  total_revenue numeric,
  total_packs bigint,
  deposit_count bigint,
  withdraw_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.nickname,
    p.phone,
    p.disabled_at,
    p.balance,
    p.total_recharge,
    p.total_withdrawal,
    COALESCE(SUM(o.invested_amount), 0) AS total_investment,
    COALESCE(SUM(o.earned_amount), 0) AS total_earned,
    COALESCE(SUM(o.max_revenue), 0) AS total_revenue,
    COUNT(o.id) AS total_packs,
    (
      SELECT COUNT(*)
      FROM public.recharge_requests rr
      WHERE rr.user_id = p.user_id
        AND rr.status = 'approved'
    ) AS deposit_count,
    (
      SELECT COUNT(*)
      FROM public.withdraw_requests wr
      WHERE wr.user_id = p.user_id
        AND wr.status = 'approved'
    ) AS withdraw_count
  FROM public.profiles p
  LEFT JOIN public.orders o ON o.user_id = p.user_id
  GROUP BY
    p.user_id,
    p.nickname,
    p.phone,
    p.disabled_at,
    p.balance,
    p.total_recharge,
    p.total_withdrawal;
$$;

GRANT EXECUTE ON FUNCTION public.admin_user_metrics() TO authenticated;
