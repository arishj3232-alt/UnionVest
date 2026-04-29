import { supabase } from '@/integrations/supabase/client';
import { safeAsync } from '@/lib/errorHandler';

/**
 * Orders service. Owns ALL Supabase calls against the `orders` table and
 * the `purchase-pack` edge function.
 */

export interface OrderRow {
  id: string;
  pack_category: string;
  pack_level: number;
  pack_name: string;
  status: string;
  invested_amount: number;
  earned_amount: number;
  max_revenue: number;
  purchased_at: string;
  days_remaining: number;
  duration_days: number;
}

export async function fetchUserOrders(userId: string): Promise<OrderRow[]> {
  return safeAsync({ scope: 'fetchUserOrders', meta: { userId } }, async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as OrderRow[];
  });
}

export async function fetchHighestSilverLevel(userId: string): Promise<number> {
  return safeAsync({ scope: 'fetchHighestSilverLevel', meta: { userId } }, async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('pack_level')
      .eq('user_id', userId)
      .eq('pack_category', 'silver')
      .order('pack_level', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0]?.pack_level ?? 0;
  });
}

export async function purchasePack(packId: string, quantity = 1): Promise<void> {
  return safeAsync({ scope: 'purchasePack', meta: { packId, quantity } }, async () => {
    const { data, error } = await supabase.functions.invoke('purchase-pack', {
      body: { pack_id: packId, quantity },
    });
    if (error) throw new Error(error.message || 'Purchase failed');
    if (!data?.success) throw new Error(data?.error || 'Purchase failed');
  });
}