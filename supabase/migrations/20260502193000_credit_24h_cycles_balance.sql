-- Credits running orders every 24h from COALESCE(last_credited_at, purchased_at).
-- Applies matured amounts to profile balance and product_revenue (wallet ledger trigger logs balance).

CREATE OR REPLACE FUNCTION public.credit_user_earnings(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_delta_total numeric := 0;
  r record;
  v_anchor timestamptz;
  v_secs double precision;
  n_periods int;
  rem numeric;
  v_cap_units int;
  v_units int;
  v_credit numeric;
  v_new_earned numeric;
  v_new_days int;
  v_new_last timestamptz;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF v_actor IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  FOR r IN
    SELECT id, daily_earning, max_revenue, earned_amount, days_remaining, status,
           purchased_at, completed_at, last_credited_at
    FROM public.orders
    WHERE user_id = p_user_id
      AND status = 'running'
      AND days_remaining > 0
    FOR UPDATE
  LOOP
    v_anchor := COALESCE(r.last_credited_at, r.purchased_at);
    v_secs := EXTRACT(EPOCH FROM (now() - v_anchor));
    n_periods := FLOOR(v_secs / 86400.0)::int;

    IF n_periods < 1 THEN
      CONTINUE;
    END IF;

    rem := r.max_revenue - r.earned_amount;
    IF rem <= 0 THEN
      CONTINUE;
    END IF;

    IF COALESCE(r.daily_earning, 0) <= 0 THEN
      CONTINUE;
    END IF;

    v_cap_units := LEAST(
      CEIL(rem / NULLIF(r.daily_earning, 0))::int,
      3650
    );

    v_units := LEAST(n_periods, r.days_remaining, GREATEST(v_cap_units, 0));

    IF v_units < 1 THEN
      CONTINUE;
    END IF;

    v_credit := LEAST((v_units::numeric * r.daily_earning), rem);
    IF v_credit <= 0 THEN
      CONTINUE;
    END IF;

    v_new_earned := r.earned_amount + v_credit;
    v_new_days := GREATEST(r.days_remaining - v_units, 0);
    v_new_last := v_anchor + (v_units * interval '24 hours');

    UPDATE public.orders
    SET
      earned_amount = v_new_earned,
      days_remaining = v_new_days,
      last_credited_at = v_new_last,
      status = CASE
        WHEN v_new_earned >= max_revenue OR v_new_days <= 0 THEN 'completed'
        ELSE status
      END,
      completed_at = CASE
        WHEN v_new_earned >= max_revenue OR v_new_days <= 0 THEN now()
        ELSE completed_at
      END
    WHERE id = r.id;

    v_delta_total := v_delta_total + v_credit;
  END LOOP;

  IF v_delta_total > 0 THEN
    UPDATE public.profiles
    SET balance = ROUND(balance + v_delta_total, 2),
        product_revenue = ROUND(product_revenue + v_delta_total, 2)
    WHERE user_id = p_user_id;
  END IF;

  RETURN ROUND(v_delta_total, 2);
END;
$$;

-- Dashboard “Earnings” total: accrued pack value tied to elapsed time vs 24h purchase windows,
-- capped by max revenue. First interval counts as full daily before the first 24h elapses.

CREATE OR REPLACE FUNCTION public.pack_earnings_display_total(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF v_actor IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN COALESCE(
    (
      SELECT ROUND(
        SUM(
          LEAST(
            o.max_revenue,
            CASE
              WHEN EXTRACT(EPOCH FROM (now() - o.purchased_at)) < 86400 THEN o.daily_earning
              ELSE (EXTRACT(EPOCH FROM (now() - o.purchased_at)) / 86400.0) * o.daily_earning
            END
          )
        ),
        2
      )
      FROM public.orders o
      WHERE o.user_id = p_user_id
        AND COALESCE(o.daily_earning, 0) > 0
    ),
    0
  )::numeric;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pack_earnings_display_total(uuid) TO authenticated;
