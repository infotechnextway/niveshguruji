'use client';
/** Compact placeholder for pre-trade risk indicator. When the trade would push
 *  the account close to the daily drawdown floor, this card lights up. */
export function RiskMeter() {
  const usedPct = 12;
  const remainingPct = 100 - usedPct;
  const tone = usedPct >= 80 ? 'loss' : usedPct >= 50 ? 'warn' : 'ok';
  return (
    <div className={`rm ${tone}`}>
      <div className="rm-head">
        <span className="rm-lbl">Daily drawdown headroom</span>
        <span className="num">{remainingPct}%</span>
      </div>
      <div className="rm-track"><div className="rm-fill" style={{ width: `${usedPct}%` }} /></div>
      <style jsx>{`
        .rm { padding: 10px 12px; background: var(--panel-2); border: 1px solid var(--line-soft); border-radius: var(--r); display: flex; flex-direction: column; gap: 6px; }
        .rm-head { display: flex; justify-content: space-between; align-items: baseline; font-size: 11px; }
        .rm-lbl { color: var(--text-dim); font-weight: 500; }
        .rm-track { height: 4px; background: var(--panel); border-radius: 2px; overflow: hidden; }
        .rm-fill { height: 100%; border-radius: 2px; transition: width 0.3s; background: var(--gain); }
        .rm.warn .rm-fill { background: var(--warn); }
        .rm.loss .rm-fill { background: var(--loss); }
      `}</style>
    </div>
  );
}
