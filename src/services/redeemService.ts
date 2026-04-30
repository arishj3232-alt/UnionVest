import { supabase } from "@/integrations/supabase/client";

export interface AdminRedeemCodeRow {
  id: string;
  code: string;
  reward_amount: number;
  max_claims: number;
  claims_used: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminRedeemClaimRow {
  claim_id: string;
  code_id: string;
  code: string;
  user_id: string;
  user_nickname: string;
  user_phone: string;
  amount: number;
  claimed_at: string;
}

export async function applyRedeemCode(code: string): Promise<number> {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error("Please enter a redeem code.");
  }

  const { data, error } = await supabase.rpc("redeem_code_apply_safe", {
    p_code: trimmed,
  });

  if (error) {
    throw new Error(error.message || "Failed to apply redeem code.");
  }

  const result = data as { ok?: boolean; amount?: number; message?: string } | null;
  if (!result?.ok) {
    throw new Error(result?.message || "Failed to apply redeem code.");
  }

  return Number(result.amount || 0);
}

export async function adminCreateRedeemCode(input: {
  code: string;
  rewardAmount: number;
  maxClaims: number;
  isActive: boolean;
}): Promise<string> {
  const { data, error } = await supabase.rpc("admin_create_redeem_code", {
    p_code: input.code,
    p_reward_amount: input.rewardAmount,
    p_max_claims: input.maxClaims,
    p_is_active: input.isActive,
  });

  if (error) {
    throw new Error(error.message || "Failed to create redeem code.");
  }

  return String(data);
}

export async function adminListRedeemCodes(): Promise<AdminRedeemCodeRow[]> {
  const { data, error } = await supabase.rpc("admin_list_redeem_codes");
  if (error) {
    throw new Error(error.message || "Failed to load redeem codes.");
  }
  return (data || []) as AdminRedeemCodeRow[];
}

export async function adminSetRedeemCodeActive(codeId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.rpc("admin_set_redeem_code_active", {
    p_code_id: codeId,
    p_is_active: isActive,
  });
  if (error) {
    throw new Error(error.message || "Failed to update redeem code.");
  }
}

export async function adminDeleteRedeemCode(codeId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_redeem_code", {
    p_code_id: codeId,
  });
  if (error) {
    throw new Error(error.message || "Failed to delete redeem code.");
  }
}

export async function adminListRedeemClaims(): Promise<AdminRedeemClaimRow[]> {
  const { data, error } = await supabase.rpc("admin_list_redeem_claims");
  if (error) {
    throw new Error(error.message || "Failed to load redeem claims.");
  }
  return (data || []) as AdminRedeemClaimRow[];
}
