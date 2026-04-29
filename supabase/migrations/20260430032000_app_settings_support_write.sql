-- Align app_settings write policy with operational admin roles.
-- Allow super_admin / finance (is_admin) and support role to update contact settings.
DROP POLICY IF EXISTS "app_settings_admin_write" ON public.app_settings;
CREATE POLICY "app_settings_admin_write"
ON public.app_settings
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'support'::public.app_role)
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'support'::public.app_role)
);
