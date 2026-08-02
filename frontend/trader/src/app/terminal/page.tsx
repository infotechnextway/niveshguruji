'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy /terminal → Watchlist terminal. */
export default function TerminalRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/watchlist'); }, [router]);
  return null;
}
