
-- 1. Create app_role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('super_admin', 'finance', 'support');

-- 2. Create user_roles table (separate from profiles to prevent privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND revoked_at IS NULL
  )
$$;

-- 4. Create function to check if user is any admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND revoked_at IS NULL
  )
$$;

-- 5. RLS policies for user_roles table
CREATE POLICY "Super admins can manage admin users"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view admin users"
  ON public.user_roles
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- 6. Create admin audit log table
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_admin_audit_log_admin ON public.admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_log
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can insert audit logs (via security definer functions)
CREATE POLICY "System can insert audit logs"
  ON public.admin_audit_log
  FOR INSERT
  WITH CHECK (true);

-- 7. Add admin policies for recharge_requests
CREATE POLICY "Admins can view all recharge requests"
  ON public.recharge_requests
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update recharge requests"
  ON public.recharge_requests
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance'));

-- 8. Create purchase_pack_transaction function (atomic transaction)
CREATE OR REPLACE FUNCTION public.purchase_pack_transaction(
  p_user_id UUID,
  p_pack_id TEXT,
  p_pack_name TEXT,
  p_pack_category TEXT,
  p_pack_level INT,
  p_invested_amount DECIMAL(12,2),
  p_daily_earning DECIMAL(12,2),
  p_max_revenue DECIMAL(12,2),
  p_duration_days INT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance DECIMAL(12,2);
  v_order_id UUID;
BEGIN
  -- Validate inputs
  IF p_invested_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid investment amount';
  END IF;
  
  IF p_duration_days <= 0 THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;

  -- Lock user's profile row to prevent race conditions
  SELECT balance INTO v_balance
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Check sufficient balance
  IF v_balance < p_invested_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_balance, p_invested_amount;
  END IF;
  
  -- Deduct balance
  UPDATE public.profiles
  SET balance = balance - p_invested_amount
  WHERE user_id = p_user_id;
  
  -- Create order
  INSERT INTO public.orders (
    user_id, pack_id, pack_name, pack_category, pack_level,
    invested_amount, daily_earning, max_revenue,
    duration_days, days_remaining
  ) VALUES (
    p_user_id, p_pack_id, p_pack_name, p_pack_category, p_pack_level,
    p_invested_amount, p_daily_earning, p_max_revenue,
    p_duration_days, p_duration_days
  ) RETURNING id INTO v_order_id;
  
  RETURN v_order_id;
END;
$$;

-- 9. Create process_recharge_request function (admin only)
CREATE OR REPLACE FUNCTION public.process_recharge_request(
  p_request_id UUID,
  p_action TEXT,
  p_admin_id UUID,
  p_admin_notes TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Validate action
  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid action. Must be approve or reject';
  END IF;

  -- Verify admin has permission
  IF NOT (public.has_role(p_admin_id, 'super_admin') OR public.has_role(p_admin_id, 'finance')) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  -- Get request details with lock
  SELECT * INTO v_request
  FROM public.recharge_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  -- Validate request exists and is pending
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recharge request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;
  
  -- Update request status
  UPDATE public.recharge_requests
  SET 
    status = p_action || 'd',
    admin_notes = p_admin_notes,
    processed_at = NOW()
  WHERE id = p_request_id;
  
  -- If approved, credit user's balance
  IF p_action = 'approve' THEN
    UPDATE public.profiles
    SET 
      balance = balance + v_request.amount,
      total_recharge = total_recharge + v_request.amount
    WHERE user_id = v_request.user_id;
  END IF;
  
  -- Log admin action
  INSERT INTO public.admin_audit_log (
    admin_user_id, action, table_name, record_id, new_values, notes
  ) VALUES (
    p_admin_id, 
    'recharge_' || p_action, 
    'recharge_requests', 
    p_request_id,
    jsonb_build_object('status', p_action || 'd', 'amount', v_request.amount),
    p_admin_notes
  );
END;
$$;
