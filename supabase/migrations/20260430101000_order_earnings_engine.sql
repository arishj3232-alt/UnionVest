-- Daily earnings engine: credits running orders based on IST day boundaries.
-- Runs on-demand via RPC from the client (e.g., on login / orders page).

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS last_credited_at timestamptz NULL;

CREATE OR REPLACE FUNCTION public.credit_user_earnings(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_today_ist timestamp;
  v_delta_total numeric := 0;
  r record;
  v_last_ist timestamp;
  v_days int;
  v_credit numeric;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF v_actor IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- IST day boundary (midnight IST)
  v_today_ist := date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata');

  FOR r IN
    SELECT id, daily_earning, max_revenue, earned_amount, days_remaining, status,
           purchased_at, completed_at, last_credited_at
    FROM public.orders
    WHERE user_id = p_user_id
      AND status = 'running'
      AND days_remaining > 0
    FOR UPDATE
  LOOP
    v_last_ist := date_trunc(
      'day',
      COALESCE(r.last_credited_at, r.purchased_at) AT TIME ZONE 'Asia/Kolkata'
    );
    v_days := (v_today_ist::date - v_last_ist::date);
    IF v_days <= 0 THEN
      CONTINUE;
    END IF;

    -- Credit cannot exceed remaining max revenue.
    v_credit := LEAST((r.max_revenue - r.earned_amount), (r.daily_earning * v_days));
    IF v_credit < 0 THEN v_credit := 0; END IF;

    UPDATE public.orders
    SET
      earned_amount = earned_amount + v_credit,
      days_remaining = GREATEST(days_remaining - v_days, 0),
      last_credited_at = (v_today_ist AT TIME ZONE 'Asia/Kolkata'),
      status = CASE
        WHEN (earned_amount + v_credit) >= max_revenue OR (days_remaining - v_days) <= 0 THEN 'completed'
        ELSE status
      END,
      completed_at = CASE
        WHEN (earned_amount + v_credit) >= max_revenue OR (days_remaining - v_days) <= 0 THEN now()
        ELSE completed_at
      END
    WHERE id = r.id;

    v_delta_total := v_delta_total + v_credit;
  END LOOP;

  IF v_delta_total > 0 THEN
    UPDATE public.profiles
    SET product_revenue = product_revenue + v_delta_total
    WHERE user_id = p_user_id;
  END IF;

  RETURN v_delta_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_user_earnings(uuid) TO authenticated;
