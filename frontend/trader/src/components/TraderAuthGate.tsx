'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';

/** Redirects unauthenticated visitors to trader login before market API calls run. */
export function TraderAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getSession()) {
      setReady(true);
      return;
    }
    const next = encodeURIComponent(pathname + window.location.search);
    router.replace(`/login?next=${next}`);
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}
