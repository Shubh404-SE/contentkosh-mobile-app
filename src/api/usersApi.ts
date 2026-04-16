import { apiDelete, apiGet } from './apiClient';
import type { ApiResponse, BusinessUser, User, UserRole, UserSummary } from './apiTypes';

export async function getProfile(): Promise<User> {
  const response = await apiGet<ApiResponse<User>>('/api/users/profile');
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to load profile');
  }
  return response.data;
}

function normalizeBusinessUsers(data: unknown): UserSummary[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((item): UserSummary | null => {
      if (!item || typeof item !== 'object') return null;

      const obj = item as any;
      // Nested BusinessUser shape: { id, role, createdAt, user: { email, name, mobile } }
      if (obj.user && typeof obj.user === 'object') {
        const bu = obj as BusinessUser;
        const email = String(bu.user.email ?? '').trim();
        if (!email) return null;
        return {
          id: Number(bu.user.id ?? bu.id),
          email,
          name: bu.user.name ?? undefined,
          mobile: bu.user.mobile ?? undefined,
          role: bu.role,
          createdAt: bu.createdAt,
        };
      }

      // Flat User shape (fallback): { id, email, name, role, ... }
      const email = String(obj.email ?? '').trim();
      if (!email) return null;
      return {
        id: Number(obj.id),
        email,
        name: obj.name ?? undefined,
        mobile: obj.mobile ?? undefined,
        role: obj.role as UserRole,
        createdAt: obj.createdAt,
      };
    })
    .filter((x): x is UserSummary => Boolean(x));
}

export async function getBusinessUsers(businessId: number, role?: UserRole): Promise<UserSummary[]> {
  const q = role ? `?role=${encodeURIComponent(role)}` : '';
  const response = await apiGet<ApiResponse<unknown>>(`/api/business/${businessId}/users${q}`);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to load users');
  }
  return normalizeBusinessUsers(response.data);
}

export async function deleteUser(userId: number): Promise<void> {
  // Backend returns a generic response; we only need to know success/failure.
  await apiDelete(`/api/users/${userId}`);
}

