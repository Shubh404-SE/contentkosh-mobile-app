const DEFAULT_API_BASE_URL = 'http://localhost:8080';
const FALLBACK_API_BASE_URLS = ['http://10.0.2.2:8080', 'http://localhost:8080', 'http://127.0.0.1:8080'];

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function uniquePreserveOrder(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of list) {
    const k = v.trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

const ENV_API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || '';
// Legacy export used by non-HTTP helpers (UI/debug, media URLs, etc.).
// HTTP calls use `getApiBaseUrl()` to auto-recover from emulator/host connectivity issues.
export const API_BASE_URL = normalizeBaseUrl(ENV_API_BASE_URL || DEFAULT_API_BASE_URL);
const API_BASE_URL_CANDIDATES = uniquePreserveOrder([ENV_API_BASE_URL, ...FALLBACK_API_BASE_URLS, DEFAULT_API_BASE_URL]).map(
  normalizeBaseUrl
);

let cachedResolvedApiBaseUrl: string | null = null;
let cachedResolvedApiBaseUrlEnv: string | null = null;

async function probeHealth(baseUrl: string, timeoutMs: number): Promise<boolean> {
  const healthUrl = `${baseUrl}/health`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout =
    controller != null
      ? setTimeout(() => {
          controller.abort();
        }, timeoutMs)
      : undefined;

  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      signal: controller?.signal,
    });

    // If health endpoint responds, we can talk to API host.
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * Resolves a working API base URL for the current environment.
 * Useful when `EXPO_PUBLIC_API_URL` points to an unreachable host (common with emulator/physical device).
 */
export async function getApiBaseUrl(): Promise<string> {
  const currentEnv = ENV_API_BASE_URL || '';
  if (cachedResolvedApiBaseUrl && cachedResolvedApiBaseUrlEnv === currentEnv) return cachedResolvedApiBaseUrl;

  // Try env first, then fallbacks.
  for (const candidate of API_BASE_URL_CANDIDATES) {
    // If something is misconfigured, we still want quick recovery.
    // eslint-disable-next-line no-await-in-loop
    const ok = await probeHealth(candidate, 800);
    if (ok) {
      cachedResolvedApiBaseUrl = candidate;
      cachedResolvedApiBaseUrlEnv = currentEnv;
      return cachedResolvedApiBaseUrl;
    }
  }

  cachedResolvedApiBaseUrl = normalizeBaseUrl(DEFAULT_API_BASE_URL);
  cachedResolvedApiBaseUrlEnv = currentEnv;
  return cachedResolvedApiBaseUrl;
}

