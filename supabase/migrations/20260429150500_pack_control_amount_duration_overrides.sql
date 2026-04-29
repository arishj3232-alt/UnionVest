ALTER TABLE public.pack_controls
  ADD COLUMN IF NOT EXISTS duration_override numeric NULL,
  ADD COLUMN IF NOT EXISTS price_override numeric NULL,
  ADD COLUMN IF NOT EXISTS total_revenue_override numeric NULL;
