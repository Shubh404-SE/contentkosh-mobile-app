import { apiGet } from './apiClient';
import type { ApiResponse, Business } from './apiTypes';

export async function getBusinessById(businessId: number): Promise<Business> {
  const response = await apiGet<ApiResponse<Business>>(`/api/business/${businessId}`);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to load business');
  }
  return response.data;
}

