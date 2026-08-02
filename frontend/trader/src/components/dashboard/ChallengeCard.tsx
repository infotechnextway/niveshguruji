'use client';
import Link from 'next/link';
import type { ChallengeProgress } from '@/lib/types';
import { paise } from '@/lib/format';

/** Right-column signature card — this is what Kite doesn't have: challenge
 *  status. Two opposing gauges (profit-to-target + drawdown-used) restyled in
 *  the Kite palette. Warm orange for the profit progress; soft red for
 *  drawdown; only turns hot when the trader gets close to the floor. */
export function ChallengeCard({ c }: { c: ChallengeProgress }) {
  const netPnl = c.mtmEquityPaise - c.virtualCapitalPaise;
  const netClass = netPnl >= 0 ? 'gain' : 'loss';
  const ddUsed = Math.max(c.maxDrawdown.usedPct, c.dailyDrawdown.usedPct);
  const ddTone = ddUsed >= 70 ? 'hot' : 'warm';
  const isFail = c.status === 'FAILED';
  const isPass = ['PASSED_PENDING_REVIEW', 'PASSED'].includes(c.status);

  return (
    <div className="card">
      <div className="head">
        <div className="title-row">
          <span className="title">Challenge</span>
          <span className={`status status-${isPass ? 'pass' : isFail ? 'fail' : 'active'}`}>
            {isPass ? 'Passed' : isFail ? 'Failed' : 'Active'}
          </span>
        </div>
        <div className="plan">{c.planName}</div>
      </div>

      <div className="pnl">
        <div className={`pnl-value num ${netClass}`}>{paise(netPnl, { sign: true })}</div>
        <div className="pnl-lbl">Net P&amp;L today</div>
      </div>

      <div className="meters">
        <Meter
          label="Profit target"
          pct={Math.max(0, Math.min(100, ((c.mtmEquityPaise - c.virtualCapitalPaise) / Math.max(1, c.profit.targetPaise - c.virtualCapitalPaise)) * 100))}
          caption={`${Math.round(Math.max(0, Math.min(100, ((c.mtmEquityPaise - c.virtualCapitalPaise) / Math.max(1, c.profit.targetPaise - c.virtualCapitalPaise)) * 100)))}%`}
          tone="accent"
        />
        <Meter
          label="Drawdown"
          pct={ddUsed}
          caption={ddUsed >= 100 ? 'Breached' : `${ddUsed}%`}
          tone={ddTone}
        />
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-lbl">Trading days</div>
          <div className="stat-val num">{c.tradingDays.completed} / {c.tradingDays.required}</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Days left</div>
          <div className="stat-val num">{c.daysRemaining}</div>
        </div>
      </div>

      <Link href="/challenge" className="cta">View challenge details →</Link>

      <style jsx>{`
        .card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg);
          padding: 20px; box-shadow: var(--shadow-sm); position: relative; overflow: hidden; }
        .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, var(--accent), var(--accent-press)); }
        .head { margin-bottom: 18px; }
        .title-row { display: flex; align-items: center; justify-content: space-between; }
        .title { font-size: 14px; color: var(--text-dim); font-weight: 500; }
        .status { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
          letter-spacing: 0.04em; text-transform: uppercase; }
        .status-active { color: var(--accent); background: var(--accent-soft); }
        .status-pass { color: var(--gain); background: var(--gain-dim); }
        .status-fail { color: var(--loss); background: var(--loss-dim); }
        .plan { font-size: 12px; color: var(--text-dim); margin-top: 4px; }
        .pnl { margin-bottom: 18px; }
        .pnl-value { font-size: 28px; font-weight: 300; letter-spacing: -0.02em; line-height: 1.1; }
        .pnl-lbl { margin-top: 2px; font-size: 12px; color: var(--text-dim); }
        .meters { display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px; }
        .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
          padding: 12px 0; border-top: 1px solid var(--line-soft); margin-bottom: 12px; }
        .stat-lbl { font-size: 11px; color: var(--text-dim); margin-bottom: 2px; }
        .stat-val { font-size: 14px; font-weight: 500; }
        .cta { display: inline-block; font-size: 12px; color: var(--accent); text-decoration: none; font-weight: 500; }
        .cta:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}

function Meter({ label, pct, caption, tone }: {
  label: string; pct: number; caption: string; tone: 'accent' | 'warm' | 'hot';
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = tone === 'accent' ? 'var(--accent)' : tone === 'warm' ? 'var(--warn)' : 'var(--loss)';
  return (
    <div className="m">
      <div className="m-top">
        <span className="m-lbl">{label}</span>
        <span className={`m-cap num ${tone === 'hot' ? 'loss' : ''}`}>{caption}</span>
      </div>
      <div className="m-track"><div className="m-fill" style={{ width: `${clamped}%`, background: color }} /></div>
      <style jsx>{`
        .m-top { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .m-lbl { font-size: 11px; color: var(--text-dim); }
        .m-cap { font-size: 11px; font-weight: 500; color: var(--text); }
        .m-track { height: 5px; background: var(--line-soft); border-radius: 3px; overflow: hidden; }
        .m-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
      `}</style>
    </div>
  );
}
