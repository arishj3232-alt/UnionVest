-- Multi-pack bulk purchase: validates balance, creates N orders atomically.
-- Reuses existing purchase_pack_transaction logic in a loop, single tx.
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
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 50 THEN
    RAISE EXCEPTION 'Invalid quantity (must be 1-50)';
  END IF;
  IF p_unit_price <= 0 OR p_duration_days <= 0 THEN
    RAISE EXCEPTION 'Invalid pack parameters';
  END IF;

  v_total := p_unit_price * p_quantity;

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
      p_unit_price, p_daily_earning, p_max_revenue,
      p_duration_days, p_duration_days
    ) RETURNING id INTO v_order_id;
    v_order_ids := array_append(v_order_ids, v_order_id);
  END LOOP;

  RETURN v_order_ids;
END;
$$;

-- Enable realtime for instant wallet + recharge updates on the user dashboard.
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.recharge_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recharge_requests;