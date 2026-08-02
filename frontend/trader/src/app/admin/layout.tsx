'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { isAdminSession } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const bare = path === '/admin/login';
  const [ready, setReady] = useState(bare);

  useEffect(() => {
    if (bare) {
      setReady(true);
      return;
    }
    if (!isAdminSession()) {
      const next = encodeURIComponent(path);
      router.replace(`/admin/login?next=${next}`);
      return;
    }
    setReady(true);
  }, [bare, path, router]);

  if (bare) {
    return <>{children}</>;
  }

  if (!ready) {
    return null;
  }

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-main">{children}</div>
      <style jsx global>{`
        .admin-shell { display: flex; min-height: 100vh; background: var(--bg); }
        .admin-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .admin-body { flex: 1; padding: 24px 32px 40px; overflow-y: auto; }
      `}</style>
    </div>
  );
}
