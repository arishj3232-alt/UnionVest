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

const LEGACY_ORDER_NAMES = new Set([
  'Starter Level 1',
  'Premium Level 1',
  'Starter Level 2',
  'Premium Level 2',
  'Starter Level 3',
  'Premium Level 3',
  'Starter Level 4',
  'Premium Level 4',
  'Starter Level 5',
  'Premium Level 5',
]);

const SUPPORTED_PACK_IDS = [
  'silver-1', 'silver-2', 'silver-3', 'silver-4', 'silver-5',
  'gold-1', 'gold-2', 'gold-3', 'gold-4', 'gold-5',
  'activity-1',
] as const;

function isLegacyOrder(row: Pick<OrderRow, 'pack_name' | 'pack_id'>): boolean {
  if (LEGACY_ORDER_NAMES.has(row.pack_name)) return true;
  return !SUPPORTED_PACK_IDS.includes(row.pack_id as (typeof SUPPORTED_PACK_IDS)[number]);
}

export async function fetchUserOrders(userId: string): Promise<OrderRow[]> {
  return safeAsync({ scope: 'fetchUserOrders', meta: { userId } }, async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as OrderRow[]).filter((row) => !isLegacyOrder(row));
  });
}

export async function fetchHighestSilverLevel(userId: string): Promise<number> {
  return safeAsync({ scope: 'fetchHighestSilverLevel', meta: { userId } }, async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('pack_level, pack_name, pack_id')
      .eq('user_id', userId)
      .eq('pack_category', 'silver')
      .order('pack_level', { ascending: false })
      .limit(20);
    if (error) throw error;
    const valid = ((data ?? []) as Array<{ pack_level: number; pack_name: string; pack_id: string }>)
      .filter((row) => !isLegacyOrder({ pack_name: row.pack_name, pack_id: row.pack_id }));
    return valid[0]?.pack_level ?? 0;
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

export async function creditUserEarnings(userId: string): Promise<number> {
  return safeAsync({ scope: 'creditUserEarnings', meta: { userId } }, async () => {
    const { data, error } = await supabase.rpc('credit_user_earnings', { p_user_id: userId });
    if (error) throw error;
    return Number(data ?? 0);
  });
}

/** Accrued pack earnings for dashboard display (includes current 24h window before balance credit). */
export async function fetchPackEarningsDisplayTotal(userId: string): Promise<number> {
  return safeAsync({ scope: 'fetchPackEarningsDisplayTotal', meta: { userId } }, async () => {
    const { data, error } = await supabase.rpc('pack_earnings_display_total', {
      p_user_id: userId,
    });
    if (error) throw error;
    return Number(data ?? 0);
  });
}