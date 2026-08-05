'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, isDemoSession } from '@/lib/auth';

/** Redirects unauthenticated visitors to trader login before market API calls run.
 *  Explicit demo mode (login → “Try the demo dashboard”) is allowed without a JWT. */
export function TraderAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getSession() || isDemoSession()) {
      setReady(true);
      return;
    }
    const next = encodeURIComponent(pathname + window.location.search);
    router.replace(`/login?next=${next}`);
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}
