import { supabase } from '@/integrations/supabase/client';
import { safeAsync } from '@/lib/errorHandler';

export type AppRole = 'super_admin' | 'finance' | 'support' | 'user';
const ADMIN_ROLES: AppRole[] = ['super_admin', 'finance'];

export async function fetchUserRoles(userId: string): Promise<AppRole[]> {
  return safeAsync({ scope: 'fetchUserRoles', meta: { userId } }, async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .is('revoked_at', null);
    if (error) throw error;
    const roles = (data ?? []).map((r) => r.role as AppRole).filter(Boolean);
    return roles.length ? roles : ['user'];
  });
}

export const isAdminRole = (r: AppRole) => ADMIN_ROLES.includes(r);
export const hasAnyAdminRole = (roles: AppRole[]) => roles.some(isAdminRole);
export const isSuperAdmin = (roles: AppRole[]) => roles.includes('super_admin');