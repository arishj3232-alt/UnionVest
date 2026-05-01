-- 1) Lock purchase pricing to DB-side canonical catalog (ignore caller-provided price fields).
-- 2) Reconcile existing orders/balances that were created with stale legacy amounts.

CREATE OR REPLACE FUNCTION public.purchase_pack_bulk(
  p_user_id uuid,
  p_pack_id text,
  p_pack_name text,
  p_pack_category text,
  p_pack_level integer,
  p_unit_price numeric,
  p_daily_earning numeric,
  p_max_revenue numeric,
  p_duration_days integer,
  p_quantity integer
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance numeric;
  v_total numeric;
  v_order_id uuid;
  v_order_ids uuid[] := ARRAY[]::uuid[];
  i integer;
  v_price numeric;
  v_daily numeric;
  v_duration integer;
  v_max numeric;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 50 THEN
    RAISE EXCEPTION 'Invalid quantity (must be 1-50)';
  END IF;

  -- Canonical pack catalog (single source of truth for billing).
  CASE p_pack_id
    WHEN 'silver-1' THEN v_price := 1099; v_daily := 560;  v_duration := 28; v_max := 15680;
    WHEN 'silver-2' THEN v_price := 1499; v_daily := 700;  v_duration := 28; v_max := 19600;
    WHEN 'silver-3' THEN v_price := 2700; v_daily := 1000; v_duration := 28; v_max := 28000;
    WHEN 'silver-4' THEN v_price := 3500; v_daily := 1500; v_duration := 28; v_max := 42000;
    WHEN 'silver-5' THEN v_price := 3700; v_daily := 2200; v_duration := 28; v_max := 61600;
    WHEN 'gold-1'   THEN v_price := 5201; v_daily := 3500; v_duration := 7;  v_max := 24500;
    WHEN 'gold-2'   THEN v_price := 6001; v_daily := 4500; v_duration := 7;  v_max := 31500;
    WHEN 'gold-3'   THEN v_price := 6800; v_daily := 7000; v_duration := 7;  v_max := 49000;
    WHEN 'gold-4'   THEN v_price := 11500;v_daily := 15000;v_duration := 4;  v_max := 60000;
    WHEN 'gold-5'   THEN v_price := 14300;v_daily := 20000;v_duration := 4;  v_max := 80000;
    WHEN 'activity-1' THEN v_price := 1300; v_daily := 3000; v_duration := 1; v_max := 3000;
    ELSE
      RAISE EXCEPTION 'Unsupported pack id: %', p_pack_id;
  END CASE;

  v_total := v_price * p_quantity;

  SELECT balance INTO v_balance
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_balance < v_total THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_balance, v_total;
  END IF;

  UPDATE public.profiles
  SET balance = balance - v_total
  WHERE user_id = p_user_id;

  FOR i IN 1..p_quantity LOOP
    INSERT INTO public.orders (
      user_id, pack_id, pack_name, pack_category, pack_level,
      invested_amount, daily_earning, max_revenue,
      duration_days, days_remaining
    ) VALUES (
      p_user_id, p_pack_id, p_pack_name, p_pack_category, p_pack_level,
      v_price, v_daily, v_max,
      v_duration, v_duration
    ) RETURNING id INTO v_order_id;
    v_order_ids := array_append(v_order_ids, v_order_id);
  END LOOP;

  RETURN v_order_ids;
END;
$$;

-- Reconcile existing current-pack orders to canonical values and adjust balances.
DO $$
DECLARE
  rec record;
BEGIN
  -- For each user, compute net balance correction required after order normalization.
  FOR rec IN
    WITH catalog AS (
      SELECT * FROM (VALUES
        ('silver-1', 1099::numeric, 560::numeric, 15680::numeric, 28::int),
        ('silver-2', 1499::numeric, 700::numeric, 19600::numeric, 28::int),
        ('silver-3', 2700::numeric, 1000::numeric, 28000::numeric, 28::int),
        ('silver-4', 3500::numeric, 1500::numeric, 42000::numeric, 28::int),
        ('silver-5', 3700::numeric, 2200::numeric, 61600::numeric, 28::int),
        ('gold-1',   5201::numeric, 3500::numeric, 24500::numeric, 7::int),
        ('gold-2',   6001::numeric, 4500::numeric, 31500::numeric, 7::int),
        ('gold-3',   6800::numeric, 7000::numeric, 49000::numeric, 7::int),
        ('gold-4',  11500::numeric,15000::numeric, 60000::numeric, 4::int),
        ('gold-5',  14300::numeric,20000::numeric, 80000::numeric, 4::int),
        ('activity-1',1300::numeric,3000::numeric, 3000::numeric, 1::int)
      ) AS t(pack_id, price, daily, max_revenue, duration_days)
    ),
    deltas AS (
      SELECT
        o.user_id,
        SUM(c.price - o.invested_amount) AS delta
      FROM public.orders o
      JOIN catalog c ON c.pack_id = o.pack_id
      GROUP BY o.user_id
      HAVING SUM(c.price - o.invested_amount) <> 0
    )
    SELECT user_id, delta FROM deltas
  LOOP
    UPDATE public.profiles
    SET balance = balance - rec.delta
    WHERE user_id = rec.user_id;
  END LOOP;

  -- Normalize order fields to canonical values.
  WITH catalog AS (
    SELECT * FROM (VALUES
      ('silver-1', 1099::numeric, 560::numeric, 15680::numeric, 28::int),
      ('silver-2', 1499::numeric, 700::numeric, 19600::numeric, 28::int),
      ('silver-3', 2700::numeric, 1000::numeric, 28000::numeric, 28::int),
      ('silver-4', 3500::numeric, 1500::numeric, 42000::numeric, 28::int),
      ('silver-5', 3700::numeric, 2200::numeric, 61600::numeric, 28::int),
      ('gold-1',   5201::numeric, 3500::numeric, 24500::numeric, 7::int),
      ('gold-2',   6001::numeric, 4500::numeric, 31500::numeric, 7::int),
      ('gold-3',   6800::numeric, 7000::numeric, 49000::numeric, 7::int),
      ('gold-4',  11500::numeric,15000::numeric, 60000::numeric, 4::int),
      ('gold-5',  14300::numeric,20000::numeric, 80000::numeric, 4::int),
      ('activity-1',1300::numeric,3000::numeric, 3000::numeric, 1::int)
    ) AS t(pack_id, price, daily, max_revenue, duration_days)
  )
  UPDATE public.orders o
  SET
    invested_amount = c.price,
    daily_earning = c.daily,
    max_revenue = c.max_revenue,
    duration_days = c.duration_days,
    days_remaining = LEAST(o.days_remaining, c.duration_days)
  FROM catalog c
  WHERE o.pack_id = c.pack_id
    AND (
      o.invested_amount <> c.price
      OR o.daily_earning <> c.daily
      OR o.max_revenue <> c.max_revenue
      OR o.duration_days <> c.duration_days
    );
END $$;
