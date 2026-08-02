import { Icon } from '@/components/Icons';
import type { ReactNode } from 'react';

export const SIDEBAR_COLLAPSE_KEY = 'pts_sidebar_collapsed';

export type NavItem = {
  href: string;
  label: string;
  icon: (size?: number) => ReactNode;
  iconFilled?: (size?: number) => ReactNode;
};

/** Primary trader nav — Watchlist-focused terminal (no Challenge clutter). */
export const TRADER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: (s) => <Icon.Dashboard size={s ?? 18} />, iconFilled: (s) => <Icon.DashboardFilled size={s ?? 18} /> },
  { href: '/watchlist', label: 'Watchlist', icon: (s) => <Icon.Trade size={s ?? 18} />, iconFilled: (s) => <Icon.TradeFilled size={s ?? 18} /> },
  { href: '/orders',    label: 'Orders',    icon: (s) => <Icon.Orders size={s ?? 18} />,    iconFilled: (s) => <Icon.OrdersFilled size={s ?? 18} /> },
  { href: '/portfolio', label: 'Portfolio', icon: (s) => <Icon.Positions size={s ?? 18} />, iconFilled: (s) => <Icon.PositionsFilled size={s ?? 18} /> },
  { href: '/funds',     label: 'Funds',     icon: (s) => <Icon.Funds size={s ?? 18} />,     iconFilled: (s) => <Icon.FundsFilled size={s ?? 18} /> },
];

/** Mobile bottom bar tabs (first four primary routes — Funds lives in More menu). */
export const BOTTOM_NAV_TABS: NavItem[] = TRADER_NAV.slice(0, 4);

export type MoreMenuItem =
  | { kind: 'link'; href: string; label: string; icon: (size?: number) => ReactNode }
  | { kind: 'action'; label: string; icon: (size?: number) => ReactNode; action: 'signout' };

/** Items shown in the mobile More sheet (Funds + sidebar foot links). */
export const MORE_MENU_ITEMS: MoreMenuItem[] = [
  { kind: 'link', href: '/funds', label: 'Funds', icon: (s) => <Icon.Funds size={s ?? 20} /> },
  { kind: 'link', href: '/settings', label: 'Settings', icon: (s) => <Icon.Settings size={s ?? 20} /> },
  { kind: 'link', href: '/challenge', label: 'My challenge', icon: (s) => <Icon.Challenge size={s ?? 20} /> },
  { kind: 'action', label: 'Sign out', icon: (s) => <Icon.Logout size={s ?? 20} />, action: 'signout' },
];

const MORE_ACTIVE_ROUTES = ['/funds', '/settings', '/challenge'] as const;

export function isMoreNavActive(path: string, sheetOpen = false): boolean {
  if (sheetOpen) return true;
  return MORE_ACTIVE_ROUTES.some(
    (href) => path === href || path.startsWith(`${href}/`),
  );
}

export function isNavActive(path: string, href: string): boolean {
  if (href === '/dashboard') return path === '/dashboard' || path === '/';
  if (href === '/watchlist') return path === '/watchlist' || path === '/terminal' || path.startsWith('/watchlist/');
  if (href === '/portfolio') {
    return path === '/portfolio' || path === '/positions' || path === '/holdings'
      || path.startsWith('/portfolio/');
  }
  return path === href || path.startsWith(`${href}/`);
}
