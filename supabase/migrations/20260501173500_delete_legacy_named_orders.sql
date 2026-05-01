-- Permanently delete legacy plan rows that should no longer be visible.
-- These were from old catalog naming before current silver/gold IDs.

DELETE FROM public.orders
WHERE pack_name IN (
  'Starter Level 1',
  'Premium Level 1',
  'Starter Level 2',
  'Premium Level 2',
  'Starter Level 3',
  'Premium Level 3',
  'Starter Level 4',
  'Premium Level 4',
  'Starter Level 5',
  'Premium Level 5'
);

-- Optional check:
-- SELECT pack_id, pack_name, invested_amount, count(*)
-- FROM public.orders
-- GROUP BY 1,2,3
-- ORDER BY 1,2,3;
