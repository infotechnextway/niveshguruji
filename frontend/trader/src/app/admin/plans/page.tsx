'use client';
import { useState } from 'react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { paise } from '@/lib/format';
import { Icon } from '@/components/Icons';

interface Plan {
  id: string; name: string; priceInrPaise: number; virtualCapitalPaise: number;
  profitTargetPct: number; maxDrawdownPct: number; dailyDrawdownPct: number;
  minTradingDays: number; expiryDays: number; rewardPct: number;
  active: boolean; enrolled: number;
}
const PLANS: Plan[] = [
  { id: 'PL-01', name: 'Evaluator ₹1L',  priceInrPaise: 500_00,   virtualCapitalPaise: 1_00_000_00,  profitTargetPct: 8, maxDrawdownPct: 10, dailyDrawdownPct: 5, minTradingDays: 5, expiryDays: 30, rewardPct: 80, active: true, enrolled: 142 },
  { id: 'PL-02', name: 'Evaluator ₹5L',  priceInrPaise: 1500_00,  virtualCapitalPaise: 5_00_000_00,  profitTargetPct: 8, maxDrawdownPct: 10, dailyDrawdownPct: 5, minTradingDays: 5, expiryDays: 30, rewardPct: 80, active: true, enrolled: 89 },
  { id: 'PL-03', name: 'Evaluator ₹10L', priceInrPaise: 2500_00,  virtualCapitalPaise: 10_00_000_00, profitTargetPct: 8, maxDrawdownPct: 10, dailyDrawdownPct: 5, minTradingDays: 5, expiryDays: 30, rewardPct: 80, active: true, enrolled: 51 },
  { id: 'PL-04', name: 'Pro ₹25L',       priceInrPaise: 5000_00,  virtualCapitalPaise: 25_00_000_00, profitTargetPct: 6, maxDrawdownPct: 8,  dailyDrawdownPct: 4, minTradingDays: 8, expiryDays: 45, rewardPct: 85, active: false, enrolled: 0 },
];

export default function PlansPage() {
  const [selected, setSelected] = useState<Plan | null>(PLANS[2]);
  return (
    <>
      <AdminTopbar title="Plans" subtitle="Challenge templates offered to users."
        actions={<button className="btn btn-primary">+ New plan</button>} />
      <div className="admin-body">
        <div className="split">
          <div className="card-lg" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Plan</th><th className="r">Price</th><th className="r">Capital</th>
                  <th className="r">Target</th><th className="r">Enrolled</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {PLANS.map((p) => (
                  <tr key={p.id} onClick={() => setSelected(p)} style={{ cursor: 'pointer' }} className={selected?.id === p.id ? 'row-active' : ''}>
                    <td>
                      <div className="vstack">
                        <span style={{ fontWeight: 500 }}>{p.name}</span>
                        <span className="dim num" style={{ fontSize: 10 }}>{p.id}</span>
                      </div>
                    </td>
                    <td className="r num">{paise(p.priceInrPaise, { decimals: false })}</td>
                    <td className="r num">{paise(p.virtualCapitalPaise, { decimals: false })}</td>
                    <td className="r num">{p.profitTargetPct}%</td>
                    <td className="r num">{p.enrolled}</td>
                    <td><span className={`badge ${p.active ? 'badge-success' : 'badge-neutral'}`}>{p.active ? 'Active' : 'Draft'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div className="card-lg detail">
              <div className="detail-head">
                <div><h3>{selected.name}</h3><p className="dim" style={{ fontSize: 11 }}>{selected.id}</p></div>
                <span className={`badge ${selected.active ? 'badge-success' : 'badge-neutral'}`}>{selected.active ? 'Active' : 'Draft'}</span>
              </div>
              <div className="detail-body">
                <div className="section-lbl">Pricing & capital</div>
                <F label="Price to user" value={paise(selected.priceInrPaise)} />
                <F label="Virtual capital" value={paise(selected.virtualCapitalPaise)} />
                <div className="section-lbl">Rules (snapshotted on purchase)</div>
                <F label="Profit target" value={`${selected.profitTargetPct}%`} />
                <F label="Max drawdown" value={`${selected.maxDrawdownPct}%`} />
                <F label="Daily drawdown" value={`${selected.dailyDrawdownPct}%`} />
                <F label="Min trading days" value={String(selected.minTradingDays)} />
                <F label="Expiry" value={`${selected.expiryDays} days`} />
                <F label="Reward" value={`${selected.rewardPct}% of profit`} />
              </div>
              <div className="detail-actions">
                <button className="btn btn-secondary" style={{ flex: 1 }}>{selected.active ? 'Deactivate' : 'Publish'}</button>
                <button className="btn btn-primary" style={{ flex: 1 }}>Edit</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .split { display: grid; grid-template-columns: 1fr 380px; gap: 16px; align-items: start; }
        .table tbody tr.row-active { background: var(--accent-soft); }
        .detail { padding: 0; overflow: hidden; position: sticky; top: 88px; }
        .detail-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--line-soft); }
        .detail-head h3 { font-size: 15px; font-weight: 500; }
        .detail-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 6px; }
        .section-lbl { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; margin-top: 12px; }
        .detail-actions { display: flex; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--line-soft); background: var(--panel-2); }
      `}</style>
    </>
  );
}

function F({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', padding: '6px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</span>
      <span className="num" style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
