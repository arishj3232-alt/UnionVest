import { supabase } from '@/integrations/supabase/client';
import { safeAsync } from '@/lib/errorHandler';
import type { AppRole } from './rolesService';

export interface AdminRechargeRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  screenshot_url: string | null;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  profiles?: { nickname: string; phone: string } | null;
}

export interface AdminRechargePaymentRow {
  id: string;
  request_id: string;
  user_id: string;
  method: 'upi_qr' | 'bank' | 'usdt';
  amount: number;
  reference: string | null;
  screenshot_url: string | null;
  created_at: string;
}

export interface AdminUserRow {
  user_id: string;
  nickname: string;
  phone: string;
  balance: number;
  total_recharge: number;
  total_withdrawal: number;
  disabled_at: string | null;
  created_at: string;
}

export interface AdminOrderRow {
  id: string;
  user_id: string;
  pack_name: string;
  invested_amount: number;
  earned_amount: number;
  status: string;
  purchased_at: string;
}

export interface PackControlRow {
  pack_id: string;
  is_paused: boolean;
  daily_earning_override: number | null;
  duration_override: number | null;
  price_override: number | null;
  total_revenue_override: number | null;
  admin_note: string | null;
  updated_at: string;
}

export interface AdminUserMetricsRow {
  user_id: string;
  nickname: string;
  phone: string;
  disabled_at: string | null;
  balance: number;
  total_recharge: number;
  total_withdrawal: number;
  total_investment: number;
  total_earned: number;
  total_revenue: number;
  total_packs: number;
  deposit_count: number;
  withdraw_count: number;
}

export async function fetchAllRechargeRequests(): Promise<AdminRechargeRequest[]> {
  return safeAsync({ scope: 'fetchAllRechargeRequests' }, async () => {
    const { data, error } = await supabase
      .from('recharge_requests')
      .select('id, user_id, amount, status, screenshot_url, admin_notes, created_at, processed_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    const rows = (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as AdminRechargeRequest[];
    if (rows.length === 0) return rows;
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, nickname, phone')
      .in('user_id', userIds);
    const map = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    return rows.map((r) => ({ ...r, profiles: map.get(r.user_id) ?? null }));
  });
}

export async function fetchAdminUserMetrics(): Promise<AdminUserMetricsRow[]> {
  return safeAsync({ scope: 'fetchAdminUserMetrics' }, async () => {
    const { data, error } = await supabase.rpc('admin_user_metrics');
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      user_id: String(r.user_id),
      nickname: String(r.nickname ?? ''),
      phone: String(r.phone ?? ''),
      disabled_at: r.disabled_at ?? null,
      balance: Number(r.balance ?? 0),
      total_recharge: Number(r.total_recharge ?? 0),
      total_withdrawal: Number(r.total_withdrawal ?? 0),
      total_investment: Number(r.total_investment ?? 0),
      total_earned: Number(r.total_earned ?? 0),
      total_revenue: Number(r.total_revenue ?? 0),
      total_packs: Number(r.total_packs ?? 0),
      deposit_count: Number(r.deposit_count ?? 0),
      withdraw_count: Number(r.withdraw_count ?? 0),
    })) as AdminUserMetricsRow[];
  });
}

export async function fetchRechargePayments(requestId: string): Promise<AdminRechargePaymentRow[]> {
  return safeAsync({ scope: 'fetchRechargePayments', meta: { requestId } }, async () => {
    const { data, error } = await supabase
      .from('recharge_request_payments')
      .select('id, request_id, user_id, method, amount, reference, screenshot_url, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as AdminRechargePaymentRow[];
  });
}

export async function fetchAllUsers(): Promise<AdminUserRow[]> {
  return safeAsync({ scope: 'fetchAllUsers' }, async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, nickname, phone, balance, total_recharge, total_withdrawal, disabled_at, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      ...r,
      balance: Number(r.balance),
      total_recharge: Number(r.total_recharge),
      total_withdrawal: Number(r.total_withdrawal),
    })) as AdminUserRow[];
  });
}

export async function fetchAllOrders(): Promise<AdminOrderRow[]> {
  return safeAsync({ scope: 'fetchAllOrders' }, async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, user_id, pack_name, invested_amount, earned_amount, status, purchased_at')
      .order('purchased_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      ...r,
      invested_amount: Number(r.invested_amount),
      earned_amount: Number(r.earned_amount),
    })) as AdminOrderRow[];
  });
}

export async function fetchPackControls(): Promise<PackControlRow[]> {
  return safeAsync({ scope: 'fetchPackControls' }, async () => {
    const { data, error } = await supabase
      .from('pack_controls')
      .select('pack_id, is_paused, daily_earning_override, duration_override, price_override, total_revenue_override, admin_note, updated_at')
      .order('updated_at', { ascending: false });
    if (error) {
      const hint = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
      // Graceful fallback before the migration is deployed.
      if (hint.includes('pgrst205') || hint.includes("could not find the table 'public.pack_controls'")) {
        return [];
      }
      throw error;
    }
    return (data ?? []).map((r) => ({
      ...r,
      daily_earning_override:
        r.daily_earning_override == null ? null : Number(r.daily_earning_override),
      duration_override: r.duration_override == null ? null : Number(r.duration_override),
      price_override: r.price_override == null ? null : Number(r.price_override),
      total_revenue_override:
        r.total_revenue_override == null ? null : Number(r.total_revenue_override),
    })) as PackControlRow[];
  });
}

export async function getScreenshotSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from('payment-screenshots')
    .createSignedUrl(path, 60 * 5);
  if (error) return null;
  return data.signedUrl;
}

async function invokeAdmin(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export const adminApproveRecharge = (request_id: string, action: 'approve' | 'reject', admin_notes?: string) =>
  safeAsync({ scope: 'adminApproveRecharge', meta: { request_id, action } }, async () => {
    const { data: auth } = await supabase.auth.getUser();
    const adminId = auth.user?.id;
    if (!adminId) throw new Error('Unauthorized');
    const { error } = await supabase.rpc('process_recharge_request', {
      p_request_id: request_id,
      p_action: action,
      p_admin_id: adminId,
      p_admin_notes: admin_notes ?? null,
    });
    if (error) throw error;
  });

export const adminUpdateBalance = (target_user_id: string, delta: number, reason: string) =>
  invokeAdmin('admin-update-balance', { target_user_id, delta, reason });

export const adminDisableUser = (target_user_id: string, disabled: boolean, reason: string) =>
  invokeAdmin('admin-disable-user', { target_user_id, disabled, reason });

export const adminDeleteUser = (target_user_id: string, reason: string) =>
  invokeAdmin('admin-delete-user', { target_user_id, reason });

export const adminUpdateRole = (target_user_id: string, role: AppRole, grant: boolean, reason: string) =>
  invokeAdmin('admin-update-role', { target_user_id, role, grant, reason });

export const adminPausePack = (pack_id: string, paused: boolean, admin_note?: string) =>
  safeAsync({ scope: 'adminPausePack', meta: { pack_id, paused } }, async () => {
    const { error } = await supabase.from('pack_controls').upsert({
      pack_id,
      is_paused: paused,
      admin_note: admin_note ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  });

export const adminAdjustPackEarning = (pack_id: string, daily_earning: number, admin_note?: string) =>
  safeAsync({ scope: 'adminAdjustPackEarning', meta: { pack_id, daily_earning } }, async () => {
    const { error } = await supabase.from('pack_controls').upsert({
      pack_id,
      daily_earning_override: daily_earning,
      admin_note: admin_note ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  });

export const adminAdjustPackDuration = (pack_id: string, duration_days: number, admin_note?: string) =>
  safeAsync({ scope: 'adminAdjustPackDuration', meta: { pack_id, duration_days } }, async () => {
    const { error } = await supabase.from('pack_controls').upsert({
      pack_id,
      duration_override: duration_days,
      admin_note: admin_note ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  });

export const adminAdjustPackAmounts = (
  pack_id: string,
  investment_amount: number,
  total_revenue: number,
  admin_note?: string
) =>
  safeAsync({ scope: 'adminAdjustPackAmounts', meta: { pack_id, investment_amount, total_revenue } }, async () => {
    const { error } = await supabase.from('pack_controls').upsert({
      pack_id,
      price_override: investment_amount,
      total_revenue_override: total_revenue,
      admin_note: admin_note ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  });

export const adminTerminateOrderEarly = (order_id: string, reason: string) =>
  safeAsync({ scope: 'adminTerminateOrderEarly', meta: { order_id } }, async () => {
    const { data: auth } = await supabase.auth.getUser();
    const adminId = auth.user?.id;
    if (!adminId) throw new Error('Unauthorized');
    const { error } = await supabase.rpc('admin_terminate_order_early', {
      p_admin_id: adminId,
      p_order_id: order_id,
      p_reason: reason,
    });
    if (error) throw error;
  });