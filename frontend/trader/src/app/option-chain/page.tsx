'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

/** Option Chain lives inside Watchlist — redirect legacy nav/deep links. */
function RedirectInner() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const u = params.get('u');
    const q = u ? `?view=chain&u=${encodeURIComponent(u)}` : '?view=chain';
    router.replace(`/watchlist${q}`);
  }, [router, params]);
  return <div style={{ padding: 24, color: 'var(--text-dim)' }}>Redirecting…</div>;
}

export default function OptionChainRedirect() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-dim)' }}>Loading…</div>}>
      <RedirectInner />
    </Suspense>
  );
}
