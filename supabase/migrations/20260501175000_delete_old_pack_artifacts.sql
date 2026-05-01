-- Hard cleanup: remove all legacy pack artifacts from DB.
-- Keeps only current supported pack IDs.

DO $$
DECLARE
  v_valid_pack_ids text[] := ARRAY[
    'silver-1', 'silver-2', 'silver-3', 'silver-4', 'silver-5',
    'gold-1', 'gold-2', 'gold-3', 'gold-4', 'gold-5',
    'activity-1'
  ];
BEGIN
  -- 1) Delete old/legacy orders.
  DELETE FROM public.orders
  WHERE pack_id IS NULL
     OR pack_id <> ALL (v_valid_pack_ids)
     OR pack_name IN (
       'Starter Level 1', 'Premium Level 1',
       'Starter Level 2', 'Premium Level 2',
       'Starter Level 3', 'Premium Level 3',
       'Starter Level 4', 'Premium Level 4',
       'Starter Level 5', 'Premium Level 5'
     );

  -- 2) Delete old pack control rows (if any legacy pack ids exist).
  DELETE FROM public.pack_controls
  WHERE pack_id IS NULL
     OR pack_id <> ALL (v_valid_pack_ids);
END $$;

-- Optional verification queries:
-- SELECT DISTINCT pack_id, pack_name FROM public.orders ORDER BY 1,2;
-- SELECT pack_id FROM public.pack_controls ORDER BY pack_id;
