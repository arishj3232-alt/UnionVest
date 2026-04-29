
-- 1. Soft-delete column on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

-- Replace the SELECT policy so disabled profiles are hidden from the user themselves
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id AND disabled_at IS NULL);

-- Admins can always view profiles (needed for user management UI)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- 2. Revoke client EXECUTE on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.purchase_pack_transaction(uuid, text, text, text, integer, numeric, numeric, numeric, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_recharge_request(uuid, text, uuid, text) FROM anon, authenticated;

-- 3. Drop any client INSERT policy on admin_audit_log (service-role bypasses RLS anyway)
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_log;

-- 4. Server-only function: adjust user balance with audit
CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_delta NUMERIC,
  p_reason TEXT
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  IF NOT (public.has_role(p_admin_id, 'super_admin') OR public.has_role(p_admin_id, 'finance')) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Delta must be non-zero';
  END IF;

  SELECT balance INTO v_old_balance
  FROM public.profiles
  WHERE user_id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  v_new_balance := v_old_balance + p_delta;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Resulting balance would be negative';
  END IF;

  UPDATE public.profiles
  SET balance = v_new_balance
  WHERE user_id = p_target_user_id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, table_name, record_id, old_values, new_values, notes)
  VALUES (
    p_admin_id,
    'balance_adjust',
    'profiles',
    p_target_user_id,
    jsonb_build_object('balance', v_old_balance),
    jsonb_build_object('balance', v_new_balance, 'delta', p_delta),
    p_reason
  );

  RETURN v_new_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_adjust_user_balance(uuid, uuid, numeric, text) FROM anon, authenticated;

-- 5. Server-only function: soft-delete (disable) a user
CREATE OR REPLACE FUNCTION public.admin_set_user_disabled(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_disabled BOOLEAN,
  p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: super_admin role required';
  END IF;

  UPDATE public.profiles
  SET disabled_at = CASE WHEN p_disabled THEN NOW() ELSE NULL END
  WHERE user_id = p_target_user_id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, table_name, record_id, new_values, notes)
  VALUES (
    p_admin_id,
    CASE WHEN p_disabled THEN 'user_disable' ELSE 'user_enable' END,
    'profiles',
    p_target_user_id,
    jsonb_build_object('disabled', p_disabled),
    p_reason
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_disabled(uuid, uuid, boolean, text) FROM anon, authenticated;

-- 6. Server-only function: change role
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_role app_role,
  p_grant BOOLEAN,
  p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: super_admin role required';
  END IF;

  IF p_grant THEN
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (p_target_user_id, p_role, p_admin_id)
    ON CONFLICT (user_id, role) DO UPDATE
      SET revoked_at = NULL, granted_by = p_admin_id, granted_at = NOW();
  ELSE
    UPDATE public.user_roles
    SET revoked_at = NOW()
    WHERE user_id = p_target_user_id AND role = p_role AND revoked_at IS NULL;
  END IF;

  INSERT INTO public.admin_audit_log (admin_user_id, action, table_name, record_id, new_values, notes)
  VALUES (
    p_admin_id,
    CASE WHEN p_grant THEN 'role_grant' ELSE 'role_revoke' END,
    'user_roles',
    p_target_user_id,
    jsonb_build_object('role', p_role),
    p_reason
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, uuid, app_role, boolean, text) FROM anon, authenticated;

-- 7. Ensure user_roles has a unique constraint for ON CONFLICT above
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END$$;
