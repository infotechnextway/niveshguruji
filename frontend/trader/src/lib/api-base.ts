/**
 * Resolve the REST API base used by browser fetches.
 *
 * Prefer NEXT_PUBLIC_API_ORIGIN when set so long-running calls (instrument sync)
 * talk to Nest directly and are not killed by Next.js rewrite ~30s proxy limit.
 * Same-origin `/api/v1` remains the default for nginx / Vercel deployments.
 */
export function apiBase(): string {
  const origin = (process.env.NEXT_PUBLIC_API_ORIGIN || '').replace(/\/$/, '');
  if (origin) return `${origin}/api/v1`;
  return '/api/v1';
}
