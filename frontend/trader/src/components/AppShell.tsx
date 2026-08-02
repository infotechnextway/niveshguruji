'use client';
import { useEffect, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';
import { BottomNav } from './BottomNav';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import { SIDEBAR_COLLAPSE_KEY } from '@/lib/nav';
import { TraderAuthGate } from '@/components/TraderAuthGate';

/** Trader app chrome: collapsible left sidebar + top utility bar + content.
 *  Below 768px the sidebar is hidden and a fixed bottom tab bar is used instead. */
export function AppShell({
  children,
  userName = 'Kapil',
}: {
  children: React.ReactNode;
  userName?: string;
}) {
  // Match boot script on first client paint to avoid sidebar jump on reload.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const fromDom = document.documentElement.getAttribute('data-sidebar') === 'collapsed';
      const fromStore = localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1';
      setCollapsed(fromDom || fromStore);
    } catch { /* ignore */ }
  }, []);

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0');
        if (next) document.documentElement.setAttribute('data-sidebar', 'collapsed');
        else document.documentElement.removeAttribute('data-sidebar');
      } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <TraderAuthGate>
    <div className={`pts-shell${collapsed ? ' is-collapsed' : ''}`}>
      <div className="pts-shell__sidebar pts-shell__sidebar--desktop">
        <AppSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} userName={userName} />
      </div>

      <div className="pts-shell__main">
        <AppTopbar userName={userName} />
        <div className="pts-shell__content">{children}</div>
      </div>

      <BottomNav />
      <PwaInstallPrompt />
    </div>
    </TraderAuthGate>
  );
}
