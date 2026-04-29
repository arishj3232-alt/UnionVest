-- Configurable withdraw time window (IST) stored in app_settings.
INSERT INTO public.app_settings (key, value, is_public)
VALUES
  ('withdraw_start_time', '10:00', true),
  ('withdraw_end_time', '16:00', true)
ON CONFLICT (key) DO NOTHING;
