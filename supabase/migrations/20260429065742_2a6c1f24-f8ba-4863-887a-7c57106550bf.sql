-- Ensure users can upload payment screenshots into their own folder
DROP POLICY IF EXISTS "Users can upload own payment screenshots" ON storage.objects;
CREATE POLICY "Users can upload own payment screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Ensure users can read their own payment screenshots if needed by the app
DROP POLICY IF EXISTS "Users can view own payment screenshots" ON storage.objects;
CREATE POLICY "Users can view own payment screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Ensure admin reviewers can generate/view signed URLs for payment screenshots
DROP POLICY IF EXISTS "Admins can view payment screenshots" ON storage.objects;
CREATE POLICY "Admins can view payment screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND public.is_admin(auth.uid())
);