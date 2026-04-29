import { supabase } from '@/integrations/supabase/client';
import { safeAsync } from '@/lib/errorHandler';

export type ReferralLevel = 1 | 2 | 3;

export interface ReferralMember {
  user_id: string;
  nickname: string;
  phone: string;
  invitation_code: string;
  referred_by: string | null;
  product_revenue: number;
  created_at: string;
}

export interface ReferralRow {
  id: string;
  name: string;
  phone: string;
  level: ReferralLevel;
  earnings: number;
  joinedAt: string;
}

const LEVEL_RATES: Record<ReferralLevel, number> = { 1: 0.05, 2: 0.02, 3: 0.01 };

async function fetchMembersByReferredBy(code: string): Promise<ReferralMember[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, nickname, phone, invitation_code, referred_by, product_revenue, created_at')
    .eq('referred_by', code)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, product_revenue: Number(r.product_revenue) })) as ReferralMember[];
}

export async function fetchReferralTree(invitationCode: string): Promise<ReferralRow[]> {
  return safeAsync({ scope: 'fetchReferralTree', meta: { invitationCode } }, async () => {
    const level1 = await fetchMembersByReferredBy(invitationCode);
    const level2 = (
      await Promise.all(level1.map((m) => fetchMembersByReferredBy(m.invitation_code)))
    ).flat();
    const level3 = (
      await Promise.all(level2.map((m) => fetchMembersByReferredBy(m.invitation_code)))
    ).flat();

    const toRows = (members: ReferralMember[], level: ReferralLevel): ReferralRow[] =>
      members.map((m) => ({
        id: m.user_id,
        name: m.nickname,
        phone: m.phone,
        level,
        earnings: Math.floor(m.product_revenue * LEVEL_RATES[level]),
        joinedAt: m.created_at,
      }));

    return [...toRows(level1, 1), ...toRows(level2, 2), ...toRows(level3, 3)];
  });
}

