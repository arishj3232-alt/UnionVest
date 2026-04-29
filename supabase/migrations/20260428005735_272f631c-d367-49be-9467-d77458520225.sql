-- 1. Tighten is_admin() — only super_admin and finance count as admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin'::app_role, 'finance'::app_role)
      AND revoked_at IS NULL
  )
$function$;

-- 2. Lock down orders — service-role bypasses RLS so server flows still work
CREATE POLICY "Deny client inserts on orders"
ON public.orders FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "Deny client updates on orders"
ON public.orders FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny client deletes on orders"
ON public.orders FOR DELETE TO authenticated USING (false);

-- 3. Block self-insert on user_roles
CREATE POLICY "Only super admins can insert user_roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 4. Audit log: drop client insert policy
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_log;

-- 5. Revoke EXECUTE on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.process_recharge_request(uuid, text, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purchase_pack_transaction(uuid, text, text, text, integer, numeric, numeric, numeric, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invitation_code() FROM anon, authenticated;
