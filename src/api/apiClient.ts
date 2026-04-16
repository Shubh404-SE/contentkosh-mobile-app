import { API_BASE_URL } from '../constants/config';

export type ApiFetchError = {
  message: string;
  statusCode?: number;
  apiCode?: string;
  url?: string;
};

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return await response.text().catch(() => '');
  }
  return await response.json().catch(() => null);
}

async function apiFetchInternal<T>(
  path: string,
  options: ApiFetchOptions = {},
  context: { hasRetriedAfterRefresh: boolean } = { hasRetriedAfterRefresh: false }
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const method = (options.method || 'GET').toString().toUpperCase();

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[api] ${method} ${url} (credentials=include)`);
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (
    response.status === 401 &&
    !context.hasRetriedAfterRefresh &&
    path !== '/api/auth/refresh' &&
    path !== '/api/auth/login' &&
    path !== '/api/auth/signup'
  ) {
    try {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[api] 401 -> attempting refresh');
      }
      // Refresh uses httpOnly cookie; body is optional.
      await apiFetchInternal('/api/auth/refresh', { method: 'POST' }, { hasRetriedAfterRefresh: true });
      return await apiFetchInternal<T>(path, options, { hasRetriedAfterRefresh: true });
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[api] refresh failed; logging out');
      }
      onUnauthorized?.();
      // Fall through to normal error handling below for original 401 response.
    }
  }

  const body = await readResponseBody(response);

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[api] <- ${response.status} ${path}`);
  }

  if (!response.ok) {
    const bodyObj =
      body && typeof body === 'object' ? (body as { message?: string; apiCode?: string }) : undefined;
    const error: ApiFetchError = {
      message: bodyObj?.message || `Request failed (${response.status})`,
      statusCode: response.status,
      apiCode: bodyObj?.apiCode,
      url,
    };
    throw error;
  }

  return body as T;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  return apiFetchInternal<T>(path, options);
}

export async function apiFetchForm<T>(path: string, args: { method?: 'POST' | 'PUT'; form: FormData }): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const method = (args.method || 'POST').toString().toUpperCase();

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[api] ${method} ${url} (multipart, credentials=include)`);
  }

  const response = await fetch(url, {
    method,
    credentials: 'include',
    // IMPORTANT: do not set Content-Type; fetch will add proper multipart boundary.
    body: args.form,
  });

  const body = await readResponseBody(response);

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[api] <- ${response.status} ${path}`);
  }

  if (!response.ok) {
    const bodyObj =
      body && typeof body === 'object' ? (body as { message?: string; apiCode?: string }) : undefined;
    const error: ApiFetchError = {
      message: bodyObj?.message || `Request failed (${response.status})`,
      statusCode: response.status,
      apiCode: bodyObj?.apiCode,
      url,
    };
    throw error;
  }

  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' });
}

/**
 * Authenticated binary GET (e.g. streamed files). Same refresh + cookies as JSON requests.
 */
async function apiFetchBinaryInternal(
  path: string,
  context: { hasRetriedAfterRefresh: boolean } = { hasRetriedAfterRefresh: false }
): Promise<ArrayBuffer> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (
    response.status === 401 &&
    !context.hasRetriedAfterRefresh &&
    path !== '/api/auth/refresh' &&
    path !== '/api/auth/login' &&
    path !== '/api/auth/signup'
  ) {
    try {
      await apiFetchInternal('/api/auth/refresh', { method: 'POST' }, { hasRetriedAfterRefresh: true });
      return await apiFetchBinaryInternal(path, { hasRetriedAfterRefresh: true });
    } catch {
      onUnauthorized?.();
    }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let message = `Request failed (${response.status})`;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed?.message) message = parsed.message;
    } catch {
      if (text.trim()) message = text.trim().slice(0, 240);
    }
    const error: ApiFetchError = {
      message,
      statusCode: response.status,
      url,
    };
    throw error;
  }

  return await response.arrayBuffer();
}

export async function apiGetBinary(path: string): Promise<ArrayBuffer> {
  return apiFetchBinaryInternal(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}

