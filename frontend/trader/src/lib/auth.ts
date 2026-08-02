'use client';

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: 'user' | 'admin' | 'employee' };
}

/** Trader session keys (POST /auth/login). */
const K_ACCESS = 'pts_access';
const K_REFRESH = 'pts_refresh';
const K_USER = 'pts_user';
const K_DEMO = 'pts_demo';

/** Employee/admin session keys (POST /admin/auth/login) — separate from trader tokens. */
const K_EMP_ACCESS = 'pts_employee_access';
const K_EMP_REFRESH = 'pts_employee_refresh';
const K_EMP_USER = 'pts_employee_user';

const DEMO_TOKENS = new Set(['demo', 'demo-admin']);

function looksLikeJwt(token: string): boolean {
  return token.length > 20 && token.split('.').length === 3;
}

function isUsableAccessToken(token: string | null): token is string {
  return !!token && !DEMO_TOKENS.has(token) && looksLikeJwt(token);
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem(K_ACCESS);
  const refreshToken = localStorage.getItem(K_REFRESH);
  const userRaw = localStorage.getItem(K_USER);
  if (!isUsableAccessToken(accessToken) || !refreshToken || !userRaw) return null;
  try { return { accessToken, refreshToken, user: JSON.parse(userRaw) }; } catch { return null; }
}

export function setSession(s: Session): void {
  localStorage.setItem(K_ACCESS, s.accessToken);
  localStorage.setItem(K_REFRESH, s.refreshToken);
  localStorage.setItem(K_USER, JSON.stringify(s.user));
  localStorage.removeItem(K_DEMO);
}

export function clearSession(): void {
  localStorage.removeItem(K_ACCESS);
  localStorage.removeItem(K_REFRESH);
  localStorage.removeItem(K_USER);
}

/** Employee JWT used for /admin/* API routes. */
export function getEmployeeSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem(K_EMP_ACCESS);
  const refreshToken = localStorage.getItem(K_EMP_REFRESH);
  const userRaw = localStorage.getItem(K_EMP_USER);
  if (isUsableAccessToken(accessToken) && refreshToken && userRaw) {
    try { return { accessToken, refreshToken, user: JSON.parse(userRaw) }; } catch { /* fall through */ }
  }
  return migrateLegacyEmployeeSession();
}

/** One-time migration from when admin login wrote into trader keys. */
function migrateLegacyEmployeeSession(): Session | null {
  const accessToken = localStorage.getItem(K_ACCESS);
  const refreshToken = localStorage.getItem(K_REFRESH);
  const userRaw = localStorage.getItem(K_USER);
  if (!userRaw) return null;
  try {
    const user = JSON.parse(userRaw) as Session['user'];
    if (user.role !== 'employee' && user.role !== 'admin') return null;
    if (!isUsableAccessToken(accessToken) || !refreshToken) {
      purgeLegacyDemoAdmin();
      return null;
    }
    const session: Session = {
      accessToken,
      refreshToken,
      user: { ...user, role: 'employee' },
    };
    setEmployeeSession(session);
    clearSession();
    return session;
  } catch {
    return null;
  }
}

function purgeLegacyDemoAdmin(): void {
  const userRaw = localStorage.getItem(K_USER);
  if (!userRaw) return;
  try {
    const user = JSON.parse(userRaw) as Session['user'];
    const access = localStorage.getItem(K_ACCESS);
    if (
      (user.role === 'admin' || user.role === 'employee') &&
      (!access || DEMO_TOKENS.has(access) || !looksLikeJwt(access))
    ) {
      clearSession();
      clearEmployeeSession();
    }
  } catch { /* ignore */ }
}

export function setEmployeeSession(s: Session): void {
  localStorage.setItem(K_EMP_ACCESS, s.accessToken);
  localStorage.setItem(K_EMP_REFRESH, s.refreshToken);
  localStorage.setItem(K_EMP_USER, JSON.stringify({ ...s.user, role: 'employee' }));
  purgeLegacyDemoAdmin();
}

export function clearEmployeeSession(): void {
  localStorage.removeItem(K_EMP_ACCESS);
  localStorage.removeItem(K_EMP_REFRESH);
  localStorage.removeItem(K_EMP_USER);
}

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(K_DEMO) === '1' || !localStorage.getItem(K_ACCESS);
}
export function enterDemoMode(): void { localStorage.setItem(K_DEMO, '1'); }
export function exitDemoMode(): void { localStorage.removeItem(K_DEMO); }

/** True when a valid employee JWT is stored for admin API calls. */
export function isAdminSession(): boolean {
  purgeLegacyDemoAdmin();
  return getEmployeeSession() !== null;
}

export class AuthError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export interface AdminLoginResult {
  accessToken: string;
  refreshToken: string;
  totpEnabled: boolean;
}

export interface TraderLoginResult {
  accessToken: string;
  refreshToken: string;
}

export interface TraderProfile {
  _id: string;
  name: string;
  email: string;
  username?: string;
}

/** POST /auth/login — does not use api() because no session exists yet. */
export async function traderLogin(identifier: string, password: string): Promise<TraderLoginResult> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: identifier.trim(), password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const code = body?.error?.code ?? 'HTTP_ERROR';
    const message = body?.error?.message ?? `Sign-in failed (${res.status})`;
    throw new AuthError(code, message, res.status);
  }
  const data = body.data as TraderLoginResult;
  if (!isUsableAccessToken(data?.accessToken) || !data?.refreshToken) {
    throw new AuthError('INVALID_RESPONSE', 'Login did not return valid tokens', res.status);
  }
  return data;
}

/** GET /auth/me — fetch profile after login to populate session user. */
export async function fetchTraderProfile(accessToken: string): Promise<TraderProfile> {
  const res = await fetch('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const code = body?.error?.code ?? 'HTTP_ERROR';
    const message = body?.error?.message ?? `Profile fetch failed (${res.status})`;
    throw new AuthError(code, message, res.status);
  }
  return body.data as TraderProfile;
}

/** POST /admin/auth/login — does not use api() because no session exists yet. */
export async function adminLogin(
  email: string,
  password: string,
  totpCode?: string,
): Promise<AdminLoginResult> {
  const res = await fetch('/api/v1/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      ...(totpCode ? { totpCode } : {}),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const code = body?.error?.code ?? 'HTTP_ERROR';
    const message = body?.error?.message ?? `Sign-in failed (${res.status})`;
    throw new AuthError(code, message, res.status);
  }
  const data = body.data as AdminLoginResult;
  if (!isUsableAccessToken(data?.accessToken) || !data?.refreshToken) {
    throw new AuthError('INVALID_RESPONSE', 'Admin login did not return valid tokens', res.status);
  }
  return data;
}
