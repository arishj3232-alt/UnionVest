-- 1. Fix the profiles UPDATE policy to prevent balance manipulation
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update safe profile fields only"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    -- Prevent modification of financial fields
    balance = (SELECT balance FROM public.profiles WHERE user_id = auth.uid()) AND
    total_recharge = (SELECT total_recharge FROM public.profiles WHERE user_id = auth.uid()) AND
    total_withdrawal = (SELECT total_withdrawal FROM public.profiles WHERE user_id = auth.uid()) AND
    product_revenue = (SELECT product_revenue FROM public.profiles WHERE user_id = auth.uid()) AND
    invitation_code = (SELECT invitation_code FROM public.profiles WHERE user_id = auth.uid()) AND
    user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 2. Add DELETE policy for GDPR compliance
CREATE POLICY "Users can delete their own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Create recharge_requests table
CREATE TABLE public.recharge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.recharge_requests ENABLE ROW LEVEL SECURITY;

-- Users can only view their own recharge requests
CREATE POLICY "Users can view own recharge requests"
  ON public.recharge_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own recharge requests
CREATE POLICY "Users can create own recharge requests"
  ON public.recharge_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users cannot update or delete recharge requests (admin only via service role)

CREATE INDEX idx_recharge_requests_user_id ON public.recharge_requests(user_id);
CREATE INDEX idx_recharge_requests_status ON public.recharge_requests(status);

-- 4. Create orders table for investment tracking
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pack_id TEXT NOT NULL,
  pack_name TEXT NOT NULL,
  pack_category TEXT NOT NULL CHECK (pack_category IN ('silver', 'gold', 'activity')),
  pack_level INT NOT NULL CHECK (pack_level > 0),
  invested_amount DECIMAL(12,2) NOT NULL CHECK (invested_amount > 0),
  daily_earning DECIMAL(12,2) NOT NULL CHECK (daily_earning >= 0),
  max_revenue DECIMAL(12,2) NOT NULL CHECK (max_revenue > 0),
  earned_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (earned_amount >= 0),
  duration_days INT NOT NULL CHECK (duration_days > 0),
  days_remaining INT NOT NULL CHECK (days_remaining >= 0),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed')),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can only view their own orders
CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users cannot directly insert orders (must go through secure function)
-- Orders are created by server-side functions only

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_pack_category ON public.orders(pack_category);

-- 5. Update handle_new_user function with proper validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_nickname TEXT;
  v_phone TEXT;
BEGIN
  -- Validate and sanitize nickname (max 50 chars, min 2 chars)
  v_nickname := COALESCE(
    TRIM(SUBSTRING(NEW.raw_user_meta_data->>'nickname', 1, 50)),
    'User'
  );
  
  -- Ensure nickname meets minimum length
  IF v_nickname = '' OR LENGTH(v_nickname) < 2 THEN
    v_nickname := 'User';
  END IF;
  
  -- Get and validate phone
  v_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '');
  
  -- Validate phone format (10 digit Indian mobile starting with 6-9)
  IF v_phone != '' AND v_phone !~ '^[6-9][0-9]{9}$' THEN
    v_phone := '';
  END IF;
  
  INSERT INTO public.profiles (user_id, nickname, phone, invitation_code)
  VALUES (
    NEW.id,
    v_nickname,
    v_phone,
    public.generate_invitation_code()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Add table constraints for nickname length
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_nickname_length CHECK (LENGTH(nickname) >= 1 AND LENGTH(nickname) <= 50);