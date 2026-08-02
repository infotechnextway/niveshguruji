'use client';
import { useState } from 'react';
import { paise, price, signClass } from '@/lib/format';

export function HoldingsCard({ count, pnlPaise, pnlPct, currentValuePaise, investedPaise }: {
  count: number; pnlPaise: number; pnlPct: number; currentValuePaise: number; investedPaise: number;
}) {
  const [view, setView] = useState<'current' | 'invested' | 'pnl'>('current');
  const cls = signClass(pnlPaise);
  const shown = view === 'current' ? currentValuePaise : view === 'invested' ? investedPaise : pnlPaise;
  return (
    <div className="card">
      <div className="head"><span className="title">Holdings <span className="num dim">({count})</span></span></div>
      <div className="body">
        <div className="left">
          <div className={`pnl num ${cls}`}>{price(pnlPaise / 100)}</div>
          <div className={`pnl-pct num ${cls}`}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</div>
          <div className="lbl">P&amp;L</div>
        </div>
        <div className="right">
          <div className="row"><span>Current value</span><span className="num v">{paise(currentValuePaise).replace('₹','')}</span></div>
          <div className="row"><span>Investment</span><span className="num v">{paise(investedPaise).replace('₹','')}</span></div>
        </div>
      </div>
      <div className="bar-wrap">
        <div className="bar"><div className="bar-fill" style={{ width: '100%' }} /></div>
        <div className="bar-scale num dim">₹{price(shown / 100)}</div>
      </div>
      <div className="toggles">
        {(['current','invested','pnl'] as const).map((v) => (
          <label key={v} className={`toggle ${view === v ? 'on' : ''}`}>
            <input type="radio" name="holdings-view" checked={view === v} onChange={() => setView(v)} />
            <span>{v === 'current' ? 'Current value' : v === 'invested' ? 'Invested' : 'P&L'}</span>
          </label>
        ))}
      </div>
      <style jsx>{`
        .card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 20px; box-shadow: var(--shadow-sm); }
        .head { margin-bottom: 16px; }
        .title { font-size: 14px; color: var(--text-dim); font-weight: 500; }
        .body { display: grid; grid-template-columns: 1fr 1.4fr; gap: 32px; align-items: start; }
        .pnl { font-size: 32px; font-weight: 300; letter-spacing: -0.02em; line-height: 1.1; }
        .pnl-pct { font-size: 13px; margin-top: 2px; }
        .lbl { font-size: 12px; color: var(--text-dim); margin-top: 4px; }
        .right { display: flex; flex-direction: column; gap: 10px; padding-top: 6px; }
        .row { display: grid; grid-template-columns: 1fr auto; gap: 16px; font-size: 13px; color: var(--text-dim); }
        .v { color: var(--text); }
        .bar-wrap { margin-top: 22px; }
        .bar { height: 34px; border-radius: var(--r); background: var(--line-soft); overflow: hidden; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, #5b7ffb 0%, #6b8dff 100%); border-radius: var(--r); }
        .bar-scale { margin-top: 8px; font-size: 12px; }
        .toggles { display: flex; gap: 20px; margin-top: 10px; justify-content: flex-end; }
        .toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-dim); cursor: pointer; }
        .toggle input { accent-color: var(--accent); }
        .toggle.on { color: var(--text); }
      `}</style>
    </div>
  );
}
