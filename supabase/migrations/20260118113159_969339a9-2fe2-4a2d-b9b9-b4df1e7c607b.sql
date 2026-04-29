
-- Fix the overly permissive INSERT policy on admin_audit_log
-- Only security definer functions should be able to insert, which they already can
-- Remove the WITH CHECK (true) policy and rely on SECURITY DEFINER functions only

DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_log;

-- Create a more restrictive policy - only admins can insert via their own actions
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_log
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND admin_user_id = auth.uid());
