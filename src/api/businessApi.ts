import { apiGet, apiPost } from './apiClient';
import type { ApiResponse, Business } from './apiTypes';

export async function getBusinessById(businessId: number): Promise<Business> {
  const response = await apiGet<ApiResponse<Business>>(`/api/business/${businessId}`);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to load business');
  }
  return response.data;
}

export type CreateBusinessRequest = {
  instituteName: string;
  slug: string;
};

export async function checkBusinessSlugExists(slug: string): Promise<boolean> {
  const path = `/api/business/slug/${encodeURIComponent(slug)}/exists`;
  const response = await apiGet<ApiResponse<{ exists?: boolean }>>(path);
  if (!response.success) {
    throw new Error(response.message || 'Slug check failed');
  }
  return Boolean(response.data?.exists);
}

export async function createBusiness(body: CreateBusinessRequest): Promise<Business> {
  const response = await apiPost<ApiResponse<Business>>('/api/business', body);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to create business');
  }
  return response.data;
}

