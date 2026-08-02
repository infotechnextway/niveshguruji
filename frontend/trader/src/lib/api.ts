'use client';
import { getSession, getEmployeeSession, clearSession, clearEmployeeSession, isDemoMode } from './auth';

const BASE = '/api/v1';

function mergeHeaders(sessionToken: string | null, extra?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (extra) {
    if (extra instanceof Headers) {
      extra.forEach((value, key) => { headers[key] = value; });
    } else if (Array.isArray(extra)) {
      for (const [key, value] of extra) headers[key] = value;
    } else {
      Object.assign(headers, extra);
    }
  }
  // Always attach Bearer last so caller headers cannot wipe it.
  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }
  return headers;
}

function friendlyAuthMessage(
  message: string,
  status: number,
  hadSession: boolean,
  adminRoute: boolean,
): string {
  if (status !== 401) return message;
  if (adminRoute) {
    if (message === 'Missing bearer token' || !hadSession) {
      return 'Sign in as admin to continue.';
    }
    if (message === 'Invalid or expired token') {
      return 'Your admin session expired. Sign in again.';
    }
    return message;
  }
  if (message === 'Missing bearer token' || !hadSession) {
    return 'Sign in to continue.';
  }
  if (message === 'Invalid or expired token') {
    return 'Your session expired. Sign in again.';
  }
  return message;
}

function redirectAdminLogin(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const next = encodeURIComponent(path + window.location.search);
    window.location.href = `/admin/login?next=${next}`;
  }
}

function redirectTraderLogin(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.startsWith('/admin') || path === '/login') return;
  const next = encodeURIComponent(path + window.location.search);
  window.location.href = `/login?next=${next}`;
}

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number, public details?: unknown) {
    super(message);
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;
const SYNC_TIMEOUT_MS = 120_000;

function resolveTimeoutMs(path: string, override?: number): number {
  if (override != null) return override;
  if (path.includes('/sync-tokens') || path.includes('/admin/instruments/sync')) return SYNC_TIMEOUT_MS;
  return DEFAULT_TIMEOUT_MS;
}

function syncTimeoutMessage(path: string): string {
  if (path.includes('/sync-tokens') || path.includes('/admin/instruments/sync')) {
    return 'Instrument sync timed out — downloading the master file can take up to 2 minutes; try again on a stable connection';
  }
  return 'Request timed out';
}

/** Thin API client. Attaches Bearer token, unwraps the envelope, throws a
 *  typed ApiError on failure. Callers catch ApiError and render error state. */
export async function api<T>(
  path: string,
  init: RequestInit = {},
  options?: { timeoutMs?: number },
): Promise<T> {
  const adminRoute = path.startsWith('/admin');
  const session = adminRoute ? getEmployeeSession() : getSession();
  const hadSession = !!session?.accessToken;
  const ctrl = new AbortController();
  const timeoutMs = resolveTimeoutMs(path, options?.timeoutMs);
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const signal = init.signal ?? ctrl.signal;
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal,
      headers: mergeHeaders(session?.accessToken ?? null, init.headers),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) {
      const code = body?.error?.code ?? 'HTTP_ERROR';
      const fallback =
        res.status === 500 && !body?.error?.message
          ? 'Backend API unreachable — start it on port 4000 (cd backend && npm run start:api:dev)'
          : `Request failed (${res.status})`;
      const rawMessage = body?.error?.message ?? fallback;
      const message = friendlyAuthMessage(rawMessage, res.status, hadSession, adminRoute);
      if (res.status === 401) {
        if (adminRoute) {
          clearEmployeeSession();
          redirectAdminLogin();
        } else {
          clearSession();
          redirectTraderLogin();
        }
      }
      throw new ApiError(code, message, res.status, body?.error?.details);
    }
    return body.data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('TIMEOUT', syncTimeoutMessage(path), 408);
    }
    throw new ApiError('NETWORK', err instanceof Error ? err.message : 'Network error', 0);
  } finally {
    clearTimeout(timer);
  }
}

export const DEMO = isDemoMode;
