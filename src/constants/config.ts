const DEFAULT_API_BASE_URL = 'http://localhost:8080';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_BASE_URL
);

