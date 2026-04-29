-- Public app settings for support contacts and configurable QR.
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT true,
  updated_by uuid NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_read_public_or_admin" ON public.app_settings;
CREATE POLICY "app_settings_read_public_or_admin"
ON public.app_settings
FOR SELECT
TO authenticated
USING (is_public = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "app_settings_admin_write" ON public.app_settings;
CREATE POLICY "app_settings_admin_write"
ON public.app_settings
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.app_settings (key, value, is_public)
VALUES
  ('telegram_id', 'zorokun142', true),
  ('telegram_channel_url', 'https://t.me/UNIONVESTIND', true),
  ('upi_vpa', 'rizwanop111-1@okhdfcbank', true),
  ('static_qr_url', '', true)
ON CONFLICT (key) DO NOTHING;
