import { API_BASE_URL } from '../constants/config';

/**
 * Turn API logo/path fields into a full URL for `<Image source={{ uri }} />`.
 */
export function resolveMediaUrl(pathOrUrl: string | null | undefined): string | null {
  if (pathOrUrl == null || typeof pathOrUrl !== 'string') return null;
  const t = pathOrUrl.trim();
  if (t.length === 0) return null;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  const base = API_BASE_URL.replace(/\/+$/, '');
  const path = t.startsWith('/') ? t : `/${t}`;
  return `${base}${path}`;
}
