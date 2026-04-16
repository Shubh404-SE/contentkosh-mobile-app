import { create } from 'zustand';
import { getMyPermissions } from '../api/permissionApi';
import { mapApiError } from '../utils/mapApiError';

type PermissionState = {
  permissions: string[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clear: () => void;
  hasAll: (required: readonly string[]) => boolean;
};

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  isLoading: false,
  error: null,
  refresh: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const permissions = await getMyPermissions();
      set({ permissions });
    } catch (e) {
      set({ error: mapApiError(e).message || 'Failed to load permissions', permissions: [] });
    } finally {
      set({ isLoading: false });
    }
  },
  clear: () => set({ permissions: [], isLoading: false, error: null }),
  hasAll: (required) => {
    if (!required || required.length === 0) return true;
    const current = get().permissions;
    if (!current || current.length === 0) return false;
    return required.every((p) => current.includes(p));
  },
}));

