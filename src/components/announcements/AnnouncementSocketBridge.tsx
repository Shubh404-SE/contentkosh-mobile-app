import React from 'react';
import { useAnnouncementSocketBridge } from '../../hooks/useAnnouncementSocketBridge';
import { useAuthStore } from '../../store/authStore';

/**
 * Connects to the announcement Socket.IO namespace after auth (same intent as web dashboard layout).
 */
export function AnnouncementSocketBridge() {
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const user = useAuthStore((s) => s.user);
  const businessId = useAuthStore((s) => s.business?.id);

  const enabled = Boolean(!isBootstrapping && user && businessId != null);
  useAnnouncementSocketBridge(enabled, businessId ?? undefined);

  return null;
}
