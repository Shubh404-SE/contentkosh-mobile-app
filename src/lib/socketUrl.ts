import { API_BASE_URL } from '../constants/config';

/**
 * Socket.IO runs on the API host without the `/api` prefix (same as web `getAnnouncementSocketBaseUrl`).
 */
export function getAnnouncementSocketBaseUrl(): string {
  return API_BASE_URL.replace(/\/api\/?$/, '');
}
