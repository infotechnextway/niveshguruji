'use client';
import { AppShell } from '@/components/AppShell';
import { ChallengeProgressCard } from '@/components/dashboard/ChallengeProgressCard';
import { EquityChart } from '@/components/dashboard/EquityChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { makeDemoCurve } from '@/lib/demo-curve';
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

const RULES = [
  { label: 'Profit target', value: '8% (₹80,000)', met: false },
  { label: 'Max drawdown',  value: '10% (₹1,00,000)', met: true },
  { label: 'Daily drawdown', value: '5% (₹50,000)', met: true },
  { label: 'Minimum trading days', value: '5 days', met: false },
  { label: 'Expiry', value: '30 days from start', met: true },
  { label: 'Reward', value: '80% of profit', met: null },
];

const DEMO_CURVE = makeDemoCurve(DEMO_CHALLENGE.virtualCapitalPaise);

export default function ChallengePage() {
  return (
    <AppShell userName="Kapil">
      <main className="main">
        <div className="wrap">
          <div className="page-head">
            <div>
              <h1 className="ph-title">Evaluator ₹10,00,000</h1>
              <p className="dim">Started 5 days ago · 27 days remaining · <span className="badge badge-info">Active</span></p>
            </div>
          </div>

          <div className="grid-2">
            <ChallengeProgressCard c={DEMO_CHALLENGE} />
            <div className="vstack gap-4">
              <StatCard label="Peak equity" value={10_31_200_00} icon={<Icon.BarChart size={14}/>} />
              <StatCard label="Worst drawdown" value={-8_500_00} icon={<Icon.Sliders size={14}/>} />
            </div>
          </div>

          <EquityChart series={DEMO_CURVE} capital={DEMO_CHALLENGE.virtualCapitalPaise} />

          <div className="card-lg" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 500 }}>Rules of your evaluation</h3>
              <p className="dim" style={{ fontSize: 11, marginTop: 2 }}>Snapshotted when the challenge started — these do not change mid-evaluation.</p>
            </div>
            <div className="rules">
              {RULES.map((r) => (
                <div key={r.label} className="rule">
                  <div className="hstack gap-2">
                    {r.met === true ? <span className="rule-icon ok"><Icon.Check size={12}/></span>
                     : r.met === false ? <span className="rule-icon pending"></span>
                     : <span className="rule-icon info">i</span>}
                    <div>
                      <div className="rule-label">{r.label}</div>
                      <div className="dim" style={{ fontSize: 11 }}>{r.value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <style jsx>{`
        .main { background: var(--bg); }
        .wrap { max-width: 1400px; margin: 0 auto; padding: 28px 32px 60px; display: flex; flex-direction: column; gap: 20px; }
        .page-head { display: flex; justify-content: space-between; align-items: flex-end; }
        .ph-title { font-size: 22px; font-weight: 500; letter-spacing: -0.01em; }
        .grid-2 { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; }
        .rules { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .rule { padding: 14px 20px; border-right: 1px solid var(--line-soft); border-bottom: 1px solid var(--line-soft); }
        .rule:nth-child(2n) { border-right: none; }
        .rule:nth-last-child(-n+2) { border-bottom: none; }
        .rule-label { font-size: 13px; font-weight: 500; }
        .rule-icon { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; font-size: 11px; font-weight: 600; }
        .rule-icon.ok { background: var(--gain-soft); color: var(--gain); }
        .rule-icon.pending { background: var(--panel-2); border: 1px dashed var(--line-strong); }
        .rule-icon.info { background: var(--accent-soft); color: var(--accent); }
        @media (max-width: 900px) {
          .grid-2 { grid-template-columns: 1fr; }
          .wrap { padding: 20px 16px 48px; }
        }
        @media (max-width: 560px) {
          .rules { grid-template-columns: 1fr; }
          .rule { border-right: none; }
          .rule:nth-last-child(-n+2) { border-bottom: 1px solid var(--line-soft); }
          .rule:last-child { border-bottom: none; }
          .wrap { padding: 16px 12px 40px; }
        }
      `}</style>
    </AppShell>
  );
}
