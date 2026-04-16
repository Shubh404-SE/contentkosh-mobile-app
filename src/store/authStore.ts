import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Business, User } from '../api/apiTypes';
import { getProfile } from '../api/usersApi';
import { getBusinessById } from '../api/businessApi';
import { mapApiError } from '../utils/mapApiError';

type AuthState = {
  user: User | null;
  business: Business | null;
  isBootstrapping: boolean;
  bootstrapError: string | null;
  setUser: (user: User | null) => void;
  setBusiness: (business: Business | null) => void;
  clearSession: () => void;
  bootstrapFromCookieSession: () => Promise<void>;
};

const AUTH_STORAGE_KEY = 'contentkosh.auth.v1';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      business: null,
      isBootstrapping: true,
      bootstrapError: null,
      setUser: (user) => set({ user, bootstrapError: null }),
      setBusiness: (business) => set({ business, bootstrapError: null }),
      clearSession: () =>
        set({
          user: null,
          business: null,
          bootstrapError: null,
        }),
      bootstrapFromCookieSession: async () => {
        set({ isBootstrapping: true, bootstrapError: null });
        try {
          const user = await getProfile();
          set({ user });

          const businessId = user.businessId ?? null;
          if (typeof businessId === 'number') {
            const business = await getBusinessById(businessId);
            set({ business });
          } else {
            set({ business: null });
          }
        } catch (e) {
          const appError = mapApiError(e);
          if (appError.statusCode === 401 || appError.statusCode === 403) {
            get().clearSession();
          }
          set({ bootstrapError: appError.message || 'Failed to restore session' });
        } finally {
          set({ isBootstrapping: false });
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        business: state.business,
      }),
    }
  )
);

