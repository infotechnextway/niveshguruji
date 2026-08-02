'use client';
import { paise } from '@/lib/format';

export function EquityCard({ title, icon, marginAvailablePaise, marginsUsedPaise, openingBalancePaise }: {
  title: string; icon: 'equity' | 'commodity';
  marginAvailablePaise: number; marginsUsedPaise: number; openingBalancePaise: number;
}) {
  const cls = marginAvailablePaise < 0 ? 'loss' : marginAvailablePaise > 0 ? 'gain' : '';
  return (
    <div className="card">
      <div className="card-head">
        <span className="icon">{icon === 'equity' ? <EquityIcon/> : <CommodityIcon/>}</span>
        <span className="title">{title}</span>
      </div>
      <div className="card-body">
        <div className="left">
          <div className={`main num ${cls}`}>{paise(marginAvailablePaise)}</div>
          <div className="sub">Margin available</div>
        </div>
        <div className="right">
          <div className="row"><span className="label">Margins used</span><span className="num val">{paise(marginsUsedPaise, { decimals: false })}</span></div>
          <div className="row"><span className="label">Opening balance</span><span className={`num val ${openingBalancePaise < 0 ? 'loss' : ''}`}>{paise(openingBalancePaise)}</span></div>
          <a href="#" className="view-link"><span className="dot"/> View statement</a>
        </div>
      </div>
      <style jsx>{`
        .card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 20px; box-shadow: var(--shadow-sm); }
        .card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; color: var(--text-dim); }
        .icon { display: grid; place-items: center; color: var(--text-dim); }
        .title { font-size: 14px; font-weight: 500; color: var(--text-dim); }
        .card-body { display: grid; grid-template-columns: 1fr 1.4fr; gap: 32px; align-items: start; }
        .main { font-size: 32px; font-weight: 300; letter-spacing: -0.02em; line-height: 1.1; }
        .sub { margin-top: 4px; font-size: 12px; color: var(--text-dim); }
        .right { display: flex; flex-direction: column; gap: 10px; }
        .row { display: grid; grid-template-columns: 1fr auto; gap: 16px; font-size: 13px; }
        .label { color: var(--text-dim); }
        .val { color: var(--text); }
        .view-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; color: var(--info); font-size: 12px; text-decoration: none; }
        .view-link:hover { text-decoration: underline; }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--info); display: inline-block; }
      `}</style>
    </div>
  );
}
function EquityIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2v10l7 4"/><circle cx="12" cy="12" r="10"/></svg>); }
function CommodityIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2s6 6 6 12a6 6 0 0 1-12 0c0-6 6-12 6-12z"/></svg>); }
