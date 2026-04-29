import { supabase } from '@/integrations/supabase/client';
import { safeAsync } from '@/lib/errorHandler';

/**
 * Recharge service. Owns ALL Supabase calls against `recharge_requests`
 * and the `payment-screenshots` storage bucket.
 */

export interface RechargeTransaction {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  processed_at?: string | null;
  created_at: string;
}

export async function fetchRechargeHistory(
  userId: string,
  limit = 10
): Promise<RechargeTransaction[]> {
  return safeAsync({ scope: 'fetchRechargeHistory', meta: { userId } }, async () => {
    const { data, error } = await supabase
      .from('recharge_requests')
      .select('id, amount, status, admin_notes, processed_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as RechargeTransaction[];
  });
}

export async function uploadPaymentScreenshot(
  userId: string,
  file: File,
  reference?: string
): Promise<string> {
  return safeAsync({ scope: 'uploadPaymentScreenshot', meta: { userId } }, async () => {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const safeRef = (reference ?? '')
      .toString()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .slice(0, 32);
    const suffix = safeRef ? `-${safeRef}` : '';
    const filePath = `${userId}/${Date.now()}${suffix}.${fileExt}`;
    const { error } = await supabase.storage
      .from('payment-screenshots')
      .upload(filePath, file);
    if (error) throw new Error('Failed to upload screenshot');
    return filePath;
  });
}

export async function createRechargeRequest(
  userId: string,
  amount: number,
  payments: Array<{
    method: 'upi_qr' | 'bank' | 'usdt';
    amount: number;
    screenshot_url: string | null;
    reference?: string | null;
  }>
): Promise<RechargeTransaction> {
  return safeAsync({ scope: 'createRechargeRequest', meta: { userId, amount } }, async () => {
    const { data, error } = await supabase
      .from('recharge_requests')
      .insert({
        user_id: userId,
        amount,
        // Legacy single screenshot field kept for compatibility; store first proof.
        screenshot_url: payments[0]?.screenshot_url ?? null,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;

    if (payments.length > 0) {
      const { error: pErr } = await supabase
        .from('recharge_request_payments')
        .insert(
          payments.map((p) => ({
            request_id: data.id,
            user_id: userId,
            method: p.method,
            amount: p.amount,
            reference: p.reference ?? null,
            screenshot_url: p.screenshot_url,
          }))
        );
      if (pErr) throw pErr;
    }

    return {
      id: data.id,
      amount: Number(data.amount),
      status: data.status as 'pending' | 'approved' | 'rejected',
      admin_notes: data.admin_notes ?? null,
      processed_at: data.processed_at ?? null,
      created_at: data.created_at,
    };
  });
}