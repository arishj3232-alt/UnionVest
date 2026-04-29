-- Admin viewer mode: allow all authenticated users to read admin dashboards.
-- WARNING: This exposes all users/orders/recharges data to any logged-in user.

-- Profiles: allow authenticated users to read all profiles.
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Orders: allow authenticated users to read all orders.
DROP POLICY IF EXISTS "Authenticated can view all orders" ON public.orders;
CREATE POLICY "Authenticated can view all orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Recharge requests: allow authenticated users to read all recharge requests.
DROP POLICY IF EXISTS "Authenticated can view all recharge requests" ON public.recharge_requests;
CREATE POLICY "Authenticated can view all recharge requests"
  ON public.recharge_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Recharge payments: allow authenticated users to read all payment rows.
DROP POLICY IF EXISTS "Authenticated can view all recharge payments" ON public.recharge_request_payments;
CREATE POLICY "Authenticated can view all recharge payments"
  ON public.recharge_request_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
