-- Per-pack max purchase quantity: Solidarity (activity-1) limited to 1 per transaction.

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
  v_max_purchase int;
BEGIN
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

  v_max_purchase := CASE p_pack_id
    WHEN 'activity-1' THEN 1
    ELSE 50
  END;

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > v_max_purchase THEN
    RAISE EXCEPTION 'Invalid quantity for pack % (allowed 1–%)', p_pack_id, v_max_purchase;
  END IF;

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
