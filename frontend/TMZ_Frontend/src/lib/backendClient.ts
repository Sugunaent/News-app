import { supabase } from './supabase';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';

let refreshPromise: Promise<string | null> | null = null;

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) return normalizedPath;
  return `${API_BASE_URL.replace(/\/$/, '')}${normalizedPath}`;
}

export async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  if (!refreshPromise) {
    refreshPromise = supabase.auth.refreshSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return data.session?.access_token ?? null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!(init.body instanceof FormData) && !headers.has('Content-Type') && init.body != null) {
    headers.set('Content-Type', 'application/json');
  }

  const token = await getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response = await fetch(buildApiUrl(path), { ...init, headers });

  // A request can race the one-hour access-token expiry. Refresh once and
  // replay the same request with the new Supabase access token.
  if (response.status === 401 && supabase) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      headers.set('Authorization', `Bearer ${refreshedToken}`);
      response = await fetch(buildApiUrl(path), { ...init, headers });
    }
  }

  if (!response.ok) {
    console.error(`[API] ${init.method || 'GET'} ${path} -> ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();
  if (!response.ok) {
    let message = responseText || `Request failed with status ${response.status}`;
    try {
      const payload = JSON.parse(responseText) as { detail?: unknown; message?: unknown };
      if (typeof payload.detail === 'string') message = payload.detail;
      else if (Array.isArray(payload.detail)) message = payload.detail.map((item) => item.msg || JSON.stringify(item)).join('; ');
      else if (typeof payload.message === 'string') message = payload.message;
    } catch {
    }
    console.error(`[API] ${init.method || 'GET'} ${path} detail:`, message);
    throw new Error(message);
  }

  if (!responseText) {
    return undefined as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    return responseText as unknown as T;
  }
}

export async function apiFetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, init);
}
