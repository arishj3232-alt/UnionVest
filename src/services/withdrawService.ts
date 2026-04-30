import { supabase } from '@/integrations/supabase/client';
import { safeAsync } from '@/lib/errorHandler';

export type WithdrawMethod = 'upi' | 'bank';
export type WithdrawStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface WithdrawRequestRow {
  id: string;
  user_id: string;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  net_amount: number;
  method: WithdrawMethod;
  details: Record<string, unknown>;
  status: WithdrawStatus;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
}

export async function createWithdrawRequest(params: {
  amount: number;
  method: WithdrawMethod;
  details: Record<string, unknown>;
}): Promise<string> {
  return safeAsync({ scope: 'createWithdrawRequest' }, async () => {
    const { data, error } = await supabase.rpc('create_withdraw_request', {
      p_amount: params.amount,
      p_method: params.method,
      p_details: params.details,
    });
    if (error) throw error;
    return String(data);
  });
}

export async function fetchWithdrawHistory(userId: string): Promise<WithdrawRequestRow[]> {
  return safeAsync({ scope: 'fetchWithdrawHistory', meta: { userId } }, async () => {
    const { data, error } = await supabase
      .from('withdraw_requests')
      .select(
        'id, user_id, amount, tax_rate, tax_amount, net_amount, method, details, status, admin_notes, created_at, processed_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      ...r,
      amount: Number(r.amount),
      tax_rate: Number(r.tax_rate),
      tax_amount: Number(r.tax_amount),
      net_amount: Number(r.net_amount),
    })) as WithdrawRequestRow[];
  });
}

