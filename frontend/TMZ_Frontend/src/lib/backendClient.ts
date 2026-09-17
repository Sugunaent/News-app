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

function isPublicGetEndpoint(path: string, method = 'GET'): boolean {
  if (method.toUpperCase() !== 'GET') return false;
  const normalized = path.split('?')[0].toLowerCase();
  return (
    normalized.startsWith('/api/v1/categories') ||
    normalized.startsWith('/api/v1/promotions') ||
    normalized.startsWith('/api/v1/site') ||
    normalized.startsWith('/api/v1/advertisements') ||
    normalized.startsWith('/api/v1/gamification/levels') ||
    normalized.startsWith('/api/v1/gamification/badges') ||
    normalized.startsWith('/api/v1/gamification/xp-rules') ||
    normalized === '/api/v1/articles' ||
    normalized === '/api/v1/articles/search'
  );
}

export interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  const isPublic = isPublicGetEndpoint(path, method);
  const headers = new Headers(init.headers || {});
  
  if (!(init.body instanceof FormData) && !headers.has('Content-Type') && init.body != null) {
    headers.set('Content-Type', 'application/json');
  }

  const token = init.skipAuth ? null : await getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), { ...init, headers });
  } catch (networkError) {
    // If authenticated request to public endpoint failed due to CORS preflight / network,
    // fallback immediately to an unauthenticated simple GET request.
    if (token && isPublic) {
      console.warn(`[API] Authenticated request to ${path} failed, retrying without auth...`);
      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.delete('Authorization');
      try {
        response = await fetch(buildApiUrl(path), { ...init, headers: retryHeaders });
      } catch {
        throw networkError;
      }
    } else {
      throw networkError;
    }
  }

  // A request can race the access-token expiry. Refresh once and replay.
  if (response.status === 401) {
    if (supabase) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        headers.set('Authorization', `Bearer ${refreshedToken}`);
        response = await fetch(buildApiUrl(path), { ...init, headers });
      }
    }

    // If still 401 on a public GET endpoint, retry without auth header so public content always loads
    if (response.status === 401 && isPublic) {
      const publicHeaders = new Headers(init.headers || {});
      publicHeaders.delete('Authorization');
      response = await fetch(buildApiUrl(path), { ...init, headers: publicHeaders });
    }
  }

  if (!response.ok) {
    console.error(`[API] ${method} ${path} -> ${response.status}`);
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
    console.error(`[API] ${method} ${path} detail:`, message);
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

export async function apiFetchJson<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  return apiFetch<T>(path, init);
}

