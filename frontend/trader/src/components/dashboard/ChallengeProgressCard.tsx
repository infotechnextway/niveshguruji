'use client';
import Link from 'next/link';
import type { ChallengeProgress } from '@/lib/types';
import { paise } from '@/lib/format';
import { Icon } from '../Icons';

/** The signature card — what this platform has that a broker doesn't.
 *  Redesigned: horizontal segmented progress bars, subtle status pill,
 *  clear rule metadata below. In dark mode the accent glows softly. */
export function ChallengeProgressCard({ c }: { c: ChallengeProgress }) {
  const netPnl = c.mtmEquityPaise - c.virtualCapitalPaise;
  const netClass = netPnl > 0 ? 'gain' : netPnl < 0 ? 'loss' : 'dim';
  const ddMax = Math.max(c.maxDrawdown.usedPct, c.dailyDrawdown.usedPct);
  const profitTargetSpan = c.profit.targetPaise - c.virtualCapitalPaise;
  const profitProgress = profitTargetSpan > 0
    ? Math.max(0, Math.min(100, (netPnl / profitTargetSpan) * 100))
    : 0;
  const isCrit = ddMax >= 70;
  const isPass = ['PASSED_PENDING_REVIEW', 'PASSED'].includes(c.status);
  const isFail = c.status === 'FAILED';

  return (
    <div className="cp card-lg">
      <div className="cp-head">
        <div className="vstack gap-1">
          <div className="hstack gap-2">
            <Icon.Challenge size={14}/>
            <span className="cp-title">Challenge</span>
            <span className={`badge ${isPass ? 'badge-success' : isFail ? 'badge-danger' : 'badge-info'}`}>
              {isPass ? 'Passed' : isFail ? 'Failed' : 'Active'}
            </span>
          </div>
          <span className="cp-plan">{c.planName}</span>
        </div>
        <Link href="/challenge" className="cp-link">Full view →</Link>
      </div>

      <div className="cp-pnl">
        <span className={`cp-pnl-value num ${netClass}`}>{paise(netPnl, { sign: true })}</span>
        <span className="cp-pnl-label">Net P&L since start</span>
      </div>

      <div className="cp-bars">
        <ProgressRow
          label="Profit target"
          value={profitProgress}
          rightText={`${paise(c.mtmEquityPaise - c.virtualCapitalPaise, { decimals: false })} / ${paise(c.profit.targetPaise - c.virtualCapitalPaise, { decimals: false })}`}
          tone="accent"
        />
        <ProgressRow
          label="Drawdown"
          value={ddMax}
          rightText={ddMax >= 100 ? 'Breached' : `${ddMax}% of ${c.maxDrawdown.usedPct >= c.dailyDrawdown.usedPct ? 'max' : 'daily'} limit`}
          tone={isCrit ? 'loss' : 'warn'}
        />
        <ProgressRow
          label="Trading days"
          value={(c.tradingDays.completed / Math.max(1, c.tradingDays.required)) * 100}
          rightText={`${c.tradingDays.completed} of ${c.tradingDays.required} required`}
          tone="info"
        />
      </div>

      <div className="cp-foot">
        <FootStat label="Time left" value={`${c.daysRemaining}d`} />
        <FootStat label="Realized" value={paise(c.realizedPnlPaise, { decimals: false })} valueClass={c.realizedPnlPaise >= 0 ? 'gain' : 'loss'} />
        <FootStat label="Unrealized" value={paise(c.unrealizedPnlPaise, { decimals: false })} valueClass={c.unrealizedPnlPaise >= 0 ? 'gain' : 'loss'} />
      </div>

      <style jsx>{`
        .cp { padding: 20px; display: flex; flex-direction: column; gap: 16px; position: relative; overflow: hidden; }
        .cp::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, var(--accent), transparent 70%); opacity: 0.6; }
        .cp-head { display: flex; justify-content: space-between; align-items: flex-start; }
        .cp-title { font-size: 13px; font-weight: 500; }
        .cp-plan { font-size: 11px; color: var(--text-dim); margin-left: 22px; }
        .cp-link { font-size: 11px; color: var(--accent); text-decoration: none; }
        .cp-link:hover { text-decoration: underline; }
        .cp-pnl { display: flex; flex-direction: column; gap: 2px; }
        .cp-pnl-value { font-size: 30px; font-weight: 300; letter-spacing: -0.02em; line-height: 1.1; }
        .cp-pnl-label { font-size: 11px; color: var(--text-dim); }
        .cp-bars { display: flex; flex-direction: column; gap: 14px; padding: 12px 0; border-top: 1px solid var(--line-soft); border-bottom: 1px solid var(--line-soft); }
        .cp-foot { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      `}</style>
    </div>
  );
}

function ProgressRow({ label, value, rightText, tone }: { label: string; value: number; rightText: string; tone: 'accent' | 'warn' | 'loss' | 'info' }) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = tone === 'accent' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : tone === 'loss' ? 'var(--loss)' : 'var(--info)';
  return (
    <div className="pr">
      <div className="pr-top"><span className="pr-lbl">{label}</span><span className="pr-r num dim">{rightText}</span></div>
      <div className="pr-track"><div className="pr-fill" style={{ width: `${clamped}%`, background: color }} /></div>
      <style jsx>{`
        .pr-top { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px; }
        .pr-lbl { color: var(--text-dim); font-weight: 500; }
        .pr-r { font-size: 10.5px; }
        .pr-track { height: 4px; background: var(--panel-2); border-radius: 2px; overflow: hidden; }
        .pr-fill { height: 100%; transition: width 0.4s ease; border-radius: 2px; }
      `}</style>
    </div>
  );
}

function FootStat({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="fs">
      <div className="fs-lbl">{label}</div>
      <div className={`fs-val num ${valueClass}`}>{value}</div>
      <style jsx>{`
        .fs-lbl { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
        .fs-val { font-size: 13px; font-weight: 500; }
      `}</style>
    </div>
  );
}
