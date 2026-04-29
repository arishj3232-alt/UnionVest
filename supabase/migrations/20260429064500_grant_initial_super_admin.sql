-- Grant super_admin role to the first registered user so the admin panel
-- (Ctrl+Shift+S / /admin) becomes accessible. Idempotent.
INSERT INTO public.user_roles (user_id, role)
VALUES ('60dc3001-ee9b-42f0-9bb0-9dbe0d96f757', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
