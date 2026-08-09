'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '../Icons';
import { clearEmployeeSession } from '@/lib/auth';

const SECTIONS = [
  {
    group: 'Trading',
    items: [
      { href: '/admin/kyc', label: 'KYC review', icon: Icon.Shield },
      { href: '/admin/users', label: 'Users', icon: Icon.Users },
      { href: '/admin/rewards', label: 'Rewards', icon: Icon.Challenge },
    ],
  },
  {
    group: 'Product',
    items: [
      { href: '/admin/plans', label: 'Plans', icon: Icon.Package },
      { href: '/admin/instruments', label: 'Instruments', icon: Icon.BarChart },
    ],
  },
  {
    group: 'Data API',
    items: [
      { href: '/admin/upstox', label: 'Upstox API', icon: Icon.Trade },
      { href: '/admin/angel', label: 'Angel One API', icon: Icon.Trade },
      { href: '/admin/dhan', label: 'Dhan API', icon: Icon.Trade },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/admin/employees', label: 'Employees', icon: Icon.Users },
      { href: '/admin/config', label: 'Configuration', icon: Icon.Sliders },
      { href: '/admin/audit', label: 'Audit log', icon: Icon.FileText },
    ],
  },
];

function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const path = usePathname();
  const router = useRouter();

  function signOut() {
    clearEmployeeSession();
    router.replace('/admin/login');
  }

  return (
    <aside className="admin-sb" aria-label="Admin">
      <div className="admin-sb__brand">
          {/* chart mark for admin chrome */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon.png" alt="" aria-hidden className="admin-sb__mark" width={28} height={28} />
        <div className="admin-sb__brand-text">
          <span className="admin-sb__brand-name">
            <span className="ng-wordmark ng-wordmark--compact">
              <span className="ng-wordmark__nivesh">NIVESH</span>
              <span className="ng-wordmark__guru">GURU</span>
            </span>
          </span>
          <span className="admin-sb__brand-tag">Admin console</span>
        </div>
      </div>

      <nav className="admin-sb__nav">
        {SECTIONS.map((g) => (
          <div key={g.group} className="admin-sb__group">
            <div className="admin-sb__group-label">{g.group}</div>
            {g.items.map((it) => {
              const active = isActive(path, it.href);
              const IconCmp = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`admin-sb__item${active ? ' active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="admin-sb__icon" aria-hidden>
                    <IconCmp size={16} />
                  </span>
                  <span className="admin-sb__label">{it.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="admin-sb__foot">
        <button type="button" className="admin-sb__item admin-sb__back" onClick={signOut}>
          <span className="admin-sb__icon" aria-hidden>
            <Icon.Logout size={14} />
          </span>
          <span className="admin-sb__label">Sign out</span>
        </button>
        <Link href="/dashboard" className="admin-sb__item admin-sb__back">
          <span className="admin-sb__icon" aria-hidden>
            <Icon.Logout size={14} />
          </span>
          <span className="admin-sb__label">Return to trader</span>
        </Link>
      </div>
    </aside>
  );
}
