import { useMemo } from 'react';
import type { UserRole } from '../api/apiTypes';
import { useAuthStore } from '../store/authStore';

export function useRole(): UserRole | null {
  const role = useAuthStore((s) => s.user?.role ?? null);
  return useMemo(() => role, [role]);
}

