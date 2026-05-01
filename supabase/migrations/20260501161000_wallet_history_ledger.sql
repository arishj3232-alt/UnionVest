-- Wallet history ledger: track every profile balance change.

CREATE TABLE IF NOT EXISTS public.wallet_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta numeric(12,2) NOT NULL,
  balance_before numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  source text NOT NULL DEFAULT 'balance_update',
  note text NULL,
  changed_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_history_user_created
  ON public.wallet_history(user_id, created_at DESC);

ALTER TABLE public.wallet_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet history" ON public.wallet_history;
CREATE POLICY "Users can view own wallet history"
  ON public.wallet_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin viewer mode: allow authenticated users to read wallet history.
DROP POLICY IF EXISTS "Authenticated can view all wallet history" ON public.wallet_history;
CREATE POLICY "Authenticated can view all wallet history"
  ON public.wallet_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Deny client insert wallet history" ON public.wallet_history;
CREATE POLICY "Deny client insert wallet history"
  ON public.wallet_history
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client update wallet history" ON public.wallet_history;
CREATE POLICY "Deny client update wallet history"
  ON public.wallet_history
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client delete wallet history" ON public.wallet_history;
CREATE POLICY "Deny client delete wallet history"
  ON public.wallet_history
  FOR DELETE
  TO authenticated
  USING (false);

CREATE OR REPLACE FUNCTION public.log_wallet_history_on_balance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta numeric(12,2);
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.balance IS DISTINCT FROM OLD.balance THEN
    v_delta := ROUND(NEW.balance - OLD.balance, 2);
    INSERT INTO public.wallet_history (
      user_id,
      delta,
      balance_before,
      balance_after,
      source,
      note,
      changed_by
    )
    VALUES (
      NEW.user_id,
      v_delta,
      OLD.balance,
      NEW.balance,
      'profile_balance_update',
      NULL,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_wallet_history_on_balance_change ON public.profiles;
CREATE TRIGGER trg_log_wallet_history_on_balance_change
AFTER UPDATE OF balance ON public.profiles
FOR EACH ROW
WHEN (OLD.balance IS DISTINCT FROM NEW.balance)
EXECUTE FUNCTION public.log_wallet_history_on_balance_change();
