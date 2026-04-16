import { apiPost } from './apiClient';
import type { ApiResponse, UserRole, UserSummary } from './apiTypes';

export type CreateBusinessUserRequest = {
  name: string;
  email: string;
  password: string;
  mobile?: string;
  role: UserRole;
};

function normalizeCreatedUser(data: unknown): UserSummary {
  const obj = (data && typeof data === 'object' ? (data as any) : {}) as any;
  return {
    id: Number(obj.id),
    email: String(obj.email ?? ''),
    name: obj.name ?? undefined,
    mobile: obj.mobile ?? undefined,
    role: obj.role as UserRole,
    createdAt: obj.createdAt,
  };
}

export async function createBusinessUser(businessId: number, body: CreateBusinessUserRequest): Promise<UserSummary> {
  const response = await apiPost<ApiResponse<unknown>>(`/api/business/${businessId}/users`, body);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to create user');
  }
  return normalizeCreatedUser(response.data);
}

