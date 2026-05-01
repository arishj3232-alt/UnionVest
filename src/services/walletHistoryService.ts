import { supabase } from '@/integrations/supabase/client';
import { safeAsync } from '@/lib/errorHandler';

export interface WalletHistoryRow {
  id: string;
  user_id: string;
  delta: number;
  balance_before: number;
  balance_after: number;
  source: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

type RawWalletHistoryRow = {
  id: string;
  user_id: string;
  delta: number | string;
  balance_before: number | string;
  balance_after: number | string;
  source: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

export async function fetchMyWalletHistory(userId: string, limit = 50): Promise<WalletHistoryRow[]> {
  return safeAsync({ scope: 'fetchMyWalletHistory', meta: { userId } }, async () => {
    const { data, error } = await supabase
      .from('wallet_history')
      .select('id, user_id, delta, balance_before, balance_after, source, note, changed_by, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as RawWalletHistoryRow[]).map((r) => ({
      ...r,
      delta: Number(r.delta),
      balance_before: Number(r.balance_before),
      balance_after: Number(r.balance_after),
    })) as WalletHistoryRow[];
  });
}
