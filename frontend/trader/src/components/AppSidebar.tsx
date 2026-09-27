'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from './Icons';
import { TRADER_NAV, isNavActive } from '@/lib/nav';
import { clearSession } from '@/lib/auth';
import { BrandMark, BrandMonogram, BrandWordmark } from '@/components/BrandLogo';

type Props = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
  userName?: string;
};

/** Left nav: expanded = icon + label (row); collapsed = icon only. */
export function AppSidebar({
  collapsed,
  onToggleCollapse,
  mobile = false,
  onNavigate,
}: Props) {
  const path = usePathname();
  const router = useRouter();
  const iconOnly = collapsed && !mobile;

  function signOut() {
    clearSession();
    onNavigate?.();
    router.push('/login');
  }

  return (
    <aside
      className="pts-sidebar"
      data-collapsed={iconOnly ? 'true' : 'false'}
      data-mobile={mobile ? 'true' : 'false'}
      aria-label="Primary"
    >
      <div className="pts-sidebar__top">
        <Link href="/dashboard" className="pts-sidebar__brand" aria-label="NiveshGuru home" onClick={onNavigate}>
          {iconOnly ? <BrandMonogram size={32} className="pts-sidebar__mark" /> : <BrandMark size={32} className="pts-sidebar__mark" />}
          <span className="pts-sidebar__brand-text">
            <span className="pts-sidebar__brand-name"><BrandWordmark compact /></span>
            <span className="pts-sidebar__brand-sub">INVESTMENT · SIMPLIFIED</span>
          </span>
        </Link>
        <button
          type="button"
          className="pts-collapse-btn"
          onClick={onToggleCollapse}
          aria-pressed={iconOnly}
          aria-label={iconOnly ? 'Expand sidebar' : 'Collapse sidebar'}
          title={iconOnly ? 'Show labels' : 'Icons only'}
        >
          <span className="pts-collapse-btn__icon" aria-hidden>
            <Icon.ChevronLeft size={17} />
          </span>
        </button>
      </div>

      <nav className="pts-sidebar__nav">
        {TRADER_NAV.map((item) => {
          const active = isNavActive(path, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`pts-sidebar__item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              title={iconOnly ? item.label : undefined}
              onClick={onNavigate}
            >
              <span className="pts-sidebar__icon" aria-hidden>{item.icon(20)}</span>
              <span className="pts-sidebar__label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pts-sidebar__foot" aria-label="Account">
        <Link
          href="/settings"
          className={`pts-sidebar__item${isNavActive(path, '/settings') ? ' active' : ''}`}
          aria-label="Settings"
          title={iconOnly ? 'Settings' : undefined}
          onClick={onNavigate}
        >
          <span className="pts-sidebar__icon" aria-hidden><Icon.Settings size={20} /></span>
          <span className="pts-sidebar__label">Settings</span>
        </Link>
        <Link
          href="/challenge"
          className={`pts-sidebar__item${isNavActive(path, '/challenge') ? ' active' : ''}`}
          aria-label="My challenge"
          title={iconOnly ? 'My challenge' : undefined}
          onClick={onNavigate}
        >
          <span className="pts-sidebar__icon" aria-hidden><Icon.Challenge size={20} /></span>
          <span className="pts-sidebar__label">My challenge</span>
        </Link>
        <button
          type="button"
          className="pts-sidebar__item pts-sidebar__signout"
          aria-label="Sign out"
          title={iconOnly ? 'Sign out' : undefined}
          onClick={signOut}
        >
          <span className="pts-sidebar__icon" aria-hidden><Icon.Logout size={20} /></span>
          <span className="pts-sidebar__label">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
