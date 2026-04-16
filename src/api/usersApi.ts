import { apiGet } from './apiClient';
import type { ApiResponse, User, UserRole } from './apiTypes';

export async function getProfile(): Promise<User> {
  const response = await apiGet<ApiResponse<User>>('/api/users/profile');
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to load profile');
  }
  return response.data;
}

export async function getBusinessUsers(businessId: number, role?: UserRole): Promise<User[]> {
  const q = role ? `?role=${encodeURIComponent(role)}` : '';
  const response = await apiGet<ApiResponse<User[]>>(`/api/business/${businessId}/users${q}`);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to load users');
  }
  return response.data;
}

