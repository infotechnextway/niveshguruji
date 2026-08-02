'use client';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { EquityChart } from '@/components/dashboard/EquityChart';
import { ChallengeProgressCard } from '@/components/dashboard/ChallengeProgressCard';
import { PositionsTable } from '@/components/dashboard/PositionsTable';
import { useQuotes } from '@/lib/quote-store';
import { api } from '@/lib/api';
import { DEMO_INSTRUMENTS } from '@/lib/demo-feed';
import { makeDemoCurve } from '@/lib/demo-curve';
import { getSession } from '@/lib/auth';
import { Icon } from '@/components/Icons';
import type { ChallengeProgress } from '@/lib/types';

const DEMO_CHALLENGE: ChallengeProgress = {
  id: 'demo', planName: 'Evaluator ₹10,00,000', status: 'ACTIVE',
  virtualCapitalPaise: 10_00_000_00, equityPaise: 10_23_450_00, mtmEquityPaise: 10_28_720_00,
  unrealizedPnlPaise: 5_270_00, realizedPnlPaise: 23_450_00,
  profit: { targetPaise: 10_80_000_00, currentPaise: 10_28_720_00, progressPct: 36 },
  maxDrawdown: { floorPaise: 9_00_000_00, usedPct: 0 },
  dailyDrawdown: { floorPaise: 9_50_000_00, usedPct: 0 },
  tradingDays: { completed: 2, required: 5 }, daysRemaining: 27,
};

const DEMO_POSITIONS = [
  { instrumentKey: 'NSE_EQ|INE002A01018', symbol: 'RELIANCE', product: 'INTRADAY', netQty: 20, avgPrice: 2884.50 },
  { instrumentKey: 'NSE_EQ|INE009A01021', symbol: 'INFY', product: 'INTRADAY', netQty: -15, avgPrice: 1495.20 },
];

export default function DashboardPage() {
  const subscribe = useQuotes((s) => s.subscribe);
  const [challenge, setChallenge] = useState<ChallengeProgress>(DEMO_CHALLENGE);
  const [userName, setUserName] = useState('Trader');

  useEffect(() => {
    const s = getSession();
    if (s?.user?.name) setUserName(s.user.name);
    subscribe(DEMO_INSTRUMENTS.map((i) => i.instrumentKey));
    subscribe(DEMO_POSITIONS.map((p) => p.instrumentKey));

    void api<{ challenge: ChallengeProgress | null }>('/challenge/current')
      .then((res) => {
        if (res.challenge) setChallenge(res.challenge);
      })
      .catch(() => undefined);
  }, [subscribe]);

  const curve = useMemo(
    () => makeDemoCurve(challenge.virtualCapitalPaise, 30, 42, challenge.mtmEquityPaise),
    [challenge.virtualCapitalPaise, challenge.mtmEquityPaise],
  );

  const marginAvail = challenge.mtmEquityPaise - 40_000_00;

  return (
    <AppShell userName={userName}>
      <main className="main">
        <div className="wrap">
          <div className="greet">
            <h1 className="hello">Good morning, {userName.split(' ')[0]}</h1>
            <p className="sub">Here&apos;s how your evaluation is progressing.</p>
          </div>

          <section className="grid grid-4">
            <StatCard
              label="Equity"
              value={challenge.mtmEquityPaise}
              delta={{ paise: challenge.mtmEquityPaise - challenge.virtualCapitalPaise,
                pct: ((challenge.mtmEquityPaise - challenge.virtualCapitalPaise) / challenge.virtualCapitalPaise) * 100 }}
              icon={<Icon.BarChart size={14}/>}
              footer={`Starting capital ${(challenge.virtualCapitalPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`}
            />
            <StatCard
              label="Realized P&L"
              value={challenge.realizedPnlPaise}
              delta={{ paise: challenge.realizedPnlPaise, pct: (challenge.realizedPnlPaise / challenge.virtualCapitalPaise) * 100 }}
              footer="Closed trades this challenge"
            />
            <StatCard
              label="Available margin"
              value={marginAvail}
              icon={<Icon.Wallet size={14}/>}
              footer="Margins used ₹40,000"
            />
            <StatCard
              label="Trading days"
              value={challenge.tradingDays.completed}
              format="number"
              icon={<Icon.Challenge size={14}/>}
              footer={`${challenge.tradingDays.completed} of ${challenge.tradingDays.required} required · ${challenge.daysRemaining} days left`}
            />
          </section>

          <section className="grid grid-2-1">
            <EquityChart series={curve} capital={challenge.virtualCapitalPaise} />
            <ChallengeProgressCard c={challenge} />
          </section>

          <section>
            <PositionsTable rows={DEMO_POSITIONS} />
          </section>
        </div>
      </main>

      <style jsx>{`
        .main { background: var(--bg); }
        .wrap {
          max-width: 1400px; margin: 0 auto;
          padding: 28px 32px 60px;
          display: flex; flex-direction: column; gap: 24px;
        }
        .greet { display: flex; flex-direction: column; gap: 4px; }
        .hello { font-size: 22px; font-weight: 500; letter-spacing: -0.01em; }
        .sub { font-size: 13px; color: var(--text-dim); }
        .grid { display: grid; gap: 16px; }
        .grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .grid-2-1 { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
        section .sc-value, section .cp-pnl-value { color: var(--text); }
        @media (max-width: 1280px) {
          .grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 900px) {
          .grid-2-1 { grid-template-columns: 1fr; }
          .wrap { padding: 20px 16px 48px; }
        }
        @media (max-width: 560px) {
          .grid-4 { grid-template-columns: 1fr; }
          .hello { font-size: 20px; }
          .wrap { padding: 16px 12px 40px; gap: 16px; }
        }
      `}</style>
    </AppShell>
  );
}
