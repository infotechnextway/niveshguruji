'use client';
import { Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PositionsView } from '@/components/portfolio/PositionsView';
import { HoldingsView } from '@/components/portfolio/HoldingsView';

type Tab = 'positions' | 'holdings';

const TABS: Array<{ id: Tab; label: string; blurb: string }> = [
  { id: 'positions', label: 'Positions', blurb: 'Live open positions only.' },
  { id: 'holdings', label: 'Holdings', blurb: 'Delivery holdings only.' },
];

function parseTab(raw: string | null): Tab {
  return raw === 'holdings' ? 'holdings' : 'positions';
}

function PortfolioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = useMemo(() => parseTab(searchParams.get('tab')), [searchParams]);
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  const setTab = useCallback((next: Tab) => {
    const qs = next === 'positions' ? '?tab=positions' : '?tab=holdings';
    router.replace(`/portfolio${qs}`, { scroll: false });
  }, [router]);

  return (
    <AppShell>
      <main className="pf">
        <div className="head">
          <div>
            <h1>Portfolio</h1>
            <p>{active.blurb}</p>
          </div>
        </div>

        <div className="pf-tabs" role="tablist" aria-label="Portfolio sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`pf-tab${tab === t.id ? ' on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          <div hidden={tab !== 'positions'}>
            <PositionsView />
          </div>
          <div hidden={tab !== 'holdings'}>
            <HoldingsView />
          </div>
        </div>
      </main>

      <style jsx>{`
        .pf { max-width: 1100px; margin: 0 auto; padding: 24px 28px 48px; }
        .head { margin-bottom: 16px; }
        h1 { margin: 0; font-size: 22px; font-weight: 600; }
        p { margin: 6px 0 0; color: var(--text-dim); font-size: 13px; }
        @media (max-width: 700px) {
          .pf { padding: 16px 14px 32px; }
        }
      `}</style>
    </AppShell>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<AppShell><div style={{ padding: 24, color: 'var(--text-dim)' }}>Loading…</div></AppShell>}>
      <PortfolioInner />
    </Suspense>
  );
}
