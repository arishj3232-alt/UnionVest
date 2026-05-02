-- Align admin user metrics "total_earned" with live accrual logic used in app UI.
-- Formula: before first 24h show one full daily, afterwards accrue linearly by elapsed hours,
-- capped by max_revenue per order.

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
    COALESCE(
      SUM(
        CASE
          WHEN COALESCE(o.daily_earning, 0) <= 0 OR COALESCE(o.max_revenue, 0) <= 0 THEN COALESCE(o.earned_amount, 0)
          ELSE LEAST(
            o.max_revenue,
            GREATEST(
              COALESCE(o.earned_amount, 0),
              CASE
                WHEN EXTRACT(EPOCH FROM (now() - o.purchased_at)) < 86400 THEN o.daily_earning
                ELSE (EXTRACT(EPOCH FROM (now() - o.purchased_at)) / 86400.0) * o.daily_earning
              END
            )
          )
        END
      ),
      0
    ) AS total_earned,
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
