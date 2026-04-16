import type { ApiResponse } from './apiTypes';
import type {
  Announcement,
  AnnouncementBundleData,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from '../types/announcement';
import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';

export async function getUserAnnouncementBundle(): Promise<ApiResponse<AnnouncementBundleData>> {
  return apiGet<ApiResponse<AnnouncementBundleData>>('/api/announcements/user');
}

export async function getAnnouncementById(id: number): Promise<ApiResponse<Announcement>> {
  return apiGet<ApiResponse<Announcement>>(`/api/announcements/${id}`);
}

export async function createAnnouncement(
  body: CreateAnnouncementRequest
): Promise<ApiResponse<Announcement>> {
  return apiPost<ApiResponse<Announcement>>('/api/announcements', body);
}

export async function updateAnnouncement(
  id: number,
  body: UpdateAnnouncementRequest
): Promise<ApiResponse<Announcement>> {
  return apiPut<ApiResponse<Announcement>>(`/api/announcements/${id}`, body);
}

export async function deleteAnnouncement(id: number): Promise<ApiResponse<unknown>> {
  return apiDelete<ApiResponse<unknown>>(`/api/announcements/${id}`);
}
