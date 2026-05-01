-- Permanently remove legacy/old plan orders.
-- Keeps only current supported pack IDs used by the live purchase flow.

DELETE FROM public.orders
WHERE pack_id NOT IN (
  'silver-1', 'silver-2', 'silver-3', 'silver-4', 'silver-5',
  'gold-1', 'gold-2', 'gold-3', 'gold-4', 'gold-5',
  'activity-1'
);

-- Optional sanity check:
-- SELECT pack_id, pack_name, count(*) FROM public.orders GROUP BY 1,2 ORDER BY 1;
