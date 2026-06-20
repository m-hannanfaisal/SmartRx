/**
 * Thin wrapper around fetch() that:
 *  - Prepends VITE_API_URL to every path
 *  - Attaches the Bearer JWT stored in localStorage
 *  - Throws a descriptive Error for non-2xx responses
 */

import { getStoredToken } from '@/hooks/useAuth';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  json?: unknown;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { json, ...rest } = options;

  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string> | undefined),
  };

  const token = getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    rest.body = JSON.stringify(json);
  }

  const res = await fetch(`${BASE}${path}`, { ...rest, headers });

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}
