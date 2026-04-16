import React, { ReactNode, useMemo } from 'react';
import type { UserRole } from '../api/apiTypes';
import { useAuthStore } from '../store/authStore';
import { usePermissionStore } from '../store/permissionStore';
import { ForbiddenScreen } from '../screens/ForbiddenScreen';

type Props = {
  roles?: readonly UserRole[];
  permissions?: readonly string[];
  children: ReactNode;
};

export function PermissionGate({ roles, permissions, children }: Props) {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const hasAll = usePermissionStore((s) => s.hasAll);

  const allowed = useMemo(() => {
    if (!role) return false;
    if (roles && roles.length > 0 && !roles.includes(role)) return false;
    if (permissions && permissions.length > 0 && !hasAll(permissions)) return false;
    return true;
  }, [hasAll, permissions, role, roles]);

  if (!allowed) return <ForbiddenScreen />;
  return <>{children}</>;
}

