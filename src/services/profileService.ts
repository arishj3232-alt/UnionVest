import { supabase } from '@/integrations/supabase/client';
import type { User } from '@/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Profile service. Owns ALL Supabase calls against the `profiles` table.
 * Components must NEVER import the supabase client directly for profile work.
 */

interface ProfileRecord {
  id: string;
  user_id: string;
  nickname: string;
  phone: string;
  profile_picture: string | null;
  invitation_code: string;
  referred_by: string | null;
  balance: number | string;
  total_recharge: number | string;
  total_withdrawal: number | string;
  product_revenue: number | string;
  created_at: string;
}

function mapProfile(profile: ProfileRecord): User {
  return {
    id: profile.id,
    authId: profile.user_id,
    nickname: profile.nickname,
    phone: profile.phone,
    profilePicture: profile.profile_picture || undefined,
    invitationCode: profile.invitation_code,
    referredBy: profile.referred_by || undefined,
    balance: Number(profile.balance),
    totalRecharge: Number(profile.total_recharge),
    totalWithdrawal: Number(profile.total_withdrawal),
    productRevenue: Number(profile.product_revenue),
    createdAt: new Date(profile.created_at),
  };
}

export async function fetchProfileByUserId(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) {
    if (error && error.code !== 'PGRST116') {
      console.error('fetchProfileByUserId error:', error);
    }
    return null;
  }
  return mapProfile(data);
}

export async function fetchProfileForSupabaseUser(
  supabaseUser: SupabaseUser
): Promise<User | null> {
  return fetchProfileByUserId(supabaseUser.id);
}

export async function updateProfileSafeFields(
  userId: string,
  safeUpdates: { nickname?: string; profile_picture?: string }
): Promise<{ error: Error | null }> {
  if (Object.keys(safeUpdates).length === 0) return { error: null };
  const { error } = await supabase
    .from('profiles')
    .update(safeUpdates)
    .eq('user_id', userId);
  return { error: error ? new Error(error.message) : null };
}

export async function attachReferralCode(
  userId: string,
  invitationCode: string
): Promise<void> {
  // Only set referral once to prevent users from rewriting uplines.
  const { error } = await supabase
    .from('profiles')
    .update({ referred_by: invitationCode })
    .eq('user_id', userId)
    .is('referred_by', null);

  if (error) throw new Error(error.message);
}

export async function validateInvitationCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('validate_invitation_code', {
    code,
  });
  if (error) return false;
  return Boolean(data);
}