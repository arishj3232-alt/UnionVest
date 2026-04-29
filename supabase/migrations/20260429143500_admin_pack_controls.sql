-- Admin controls for pack availability and earning overrides.
CREATE TABLE IF NOT EXISTS public.pack_controls (
  pack_id text PRIMARY KEY,
  is_paused boolean NOT NULL DEFAULT false,
  daily_earning_override numeric NULL,
  admin_note text NULL,
  updated_by uuid NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pack_controls ENABLE ROW LEVEL SECURITY;

-- Users can read controls so pack cards reflect current status.
DROP POLICY IF EXISTS "pack_controls_select_all" ON public.pack_controls;
CREATE POLICY "pack_controls_select_all"
ON public.pack_controls
FOR SELECT
TO authenticated
USING (true);

-- Only admins can write controls.
DROP POLICY IF EXISTS "pack_controls_admin_write" ON public.pack_controls;
CREATE POLICY "pack_controls_admin_write"
ON public.pack_controls
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Admin can terminate running orders early.
CREATE OR REPLACE FUNCTION public.admin_terminate_order_early(
  p_admin_id uuid,
  p_order_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.orders
  SET status = 'completed',
      days_remaining = 0,
      completed_at = now()
  WHERE id = p_order_id
    AND status = 'running';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or already completed';
  END IF;

  INSERT INTO public.admin_audit_log (admin_user_id, action, table_name, record_id, new_values, notes)
  SELECT p_admin_id, 'update', 'orders', o.id::text, jsonb_build_object('status', 'completed', 'days_remaining', 0), p_reason
  FROM public.orders o
  WHERE o.id = p_order_id;
END;
$$;
