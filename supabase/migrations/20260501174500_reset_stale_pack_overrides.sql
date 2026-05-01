-- Reset stale pack amount/revenue overrides so purchases use current catalog values.
-- This fixes cases where new purchases still record old invested/max_revenue values.

UPDATE public.pack_controls
SET
  daily_earning_override = NULL,
  duration_override = NULL,
  price_override = NULL,
  total_revenue_override = NULL,
  updated_at = now()
WHERE pack_id IN (
  'silver-1', 'silver-2', 'silver-3', 'silver-4', 'silver-5',
  'gold-1', 'gold-2', 'gold-3', 'gold-4', 'gold-5',
  'activity-1'
);

-- Optional verification:
-- SELECT pack_id, price_override, daily_earning_override, duration_override, total_revenue_override
-- FROM public.pack_controls
-- ORDER BY pack_id;
