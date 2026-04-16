import { apiGet } from './apiClient';
import type { ApiResponse } from './apiTypes';

export type MyPermissionsPayload = {
  user: {
    id: number;
    role: string;
  };
  permissions: string[];
};

export async function getMyPermissions(): Promise<string[]> {
  const response = await apiGet<ApiResponse<MyPermissionsPayload>>('/api/permission');
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to load permissions');
  }
  return Array.isArray(response.data.permissions) ? response.data.permissions : [];
}

