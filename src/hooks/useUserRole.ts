import { useCallback } from 'react';
import { useAsyncResource } from './useAsyncResource';
import { fetchUserRoles, hasAnyAdminRole, isSuperAdmin, type AppRole } from '@/services/rolesService';
import { useAuth } from '@/contexts/AuthContext';

export interface UseUserRoleResult {
  roles: AppRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
}

export function useUserRole(): UseUserRoleResult {
  const { user } = useAuth();
  const userId = user?.authId ?? null;
  const fetcher = useCallback(() => fetchUserRoles(userId!), [userId]);
  const { data, isLoading } = useAsyncResource<AppRole[]>(fetcher, {
    key: userId ? `roles:${userId}` : null,
  });
  const roles = data ?? [];
  return {
    roles,
    isAdmin: hasAnyAdminRole(roles),
    isSuperAdmin: isSuperAdmin(roles),
    isLoading,
  };
}