import React from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import type { AppRole } from '@/services/rolesService';

interface RoleGuardProps {
  allow?: AppRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allow, fallback = null, children }) => {
  const { roles, isAdmin, isLoading } = useUserRole();
  if (isLoading) return null;
  const allowed = allow ? allow.some((r) => roles.includes(r)) : isAdmin;
  return <>{allowed ? children : fallback}</>;
};