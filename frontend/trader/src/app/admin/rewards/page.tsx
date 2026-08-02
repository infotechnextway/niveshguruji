'use client';
import { useState } from 'react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { paise } from '@/lib/format';
import { Icon } from '@/components/Icons';

interface Reward {
  id: string; challengeId: string; user: string; plan: string;
  finalEquityPaise: number; profitPaise: number; rewardPct: number; computedPaise: number;
  status: 'ELIGIBLE' | 'APPROVED' | 'PAID' | 'REJECTED';
  passedAt: string;
}
const DEMO: Reward[] = [
  { id: 'R-402', challengeId: 'C-5521', user: 'Rahul Sharma', plan: 'Evaluator ₹10L', finalEquityPaise: 10_92_400_00, profitPaise: 92_400_00, rewardPct: 80, computedPaise: 73_920_00, status: 'ELIGIBLE', passedAt: '31 Jul, 14:22' },
  { id: 'R-401', challengeId: 'C-5518', user: 'Priya Menon', plan: 'Evaluator ₹5L', finalEquityPaise: 5_45_200_00, profitPaise: 45_200_00, rewardPct: 80, computedPaise: 36_160_00, status: 'ELIGIBLE', passedAt: '31 Jul, 11:08' },
  { id: 'R-400', challengeId: 'C-5510', user: 'Arjun Patel', plan: 'Evaluator ₹10L', finalEquityPaise: 10_81_600_00, profitPaise: 81_600_00, rewardPct: 80, computedPaise: 65_280_00, status: 'ELIGIBLE', passedAt: '30 Jul, 15:43' },
];

export default function RewardsPage() {
  const [selected, setSelected] = useState<Reward | null>(DEMO[0]);
  const [override, setOverride] = useState('');
  const [reason, setReason] = useState('');

  return (
    <>
      <AdminTopbar
        title="Rewards"
        subtitle="Review passed evaluations and approve payouts."
        actions={<button className="btn btn-secondary">Export</button>}
      />
      <div className="admin-body">
        <div className="split">
          <div className="card-lg" style={{ padding: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <div className="hstack gap-3">
                <span className="badge badge-info">Eligible · 3</span>
                <span className="badge badge-neutral">Approved · 5</span>
                <span className="badge badge-neutral">Paid · 42</span>
                <span className="badge badge-neutral">Rejected · 2</span>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Reward</th><th>User</th><th className="r">Profit</th><th className="r">Reward</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {DEMO.map((r) => (
                  <tr key={r.id} onClick={() => setSelected(r)} style={{ cursor: 'pointer' }} className={selected?.id === r.id ? 'row-active' : ''}>
                    <td>
                      <div className="vstack">
                        <span className="num" style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500 }}>{r.id}</span>
                        <span className="dim" style={{ fontSize: 10 }}>{r.plan}</span>
                      </div>
                    </td>
                    <td>
                      <div className="vstack">
                        <span style={{ fontWeight: 500 }}>{r.user}</span>
                        <span className="dim num" style={{ fontSize: 10, fontFamily: 'var(--mono)' }}>{r.challengeId}</span>
                      </div>
                    </td>
                    <td className="r num gain">{paise(r.profitPaise, { decimals: false })}</td>
                    <td className="r num">
                      <div className="vstack">
                        <span style={{ fontWeight: 500 }}>{paise(r.computedPaise, { decimals: false })}</span>
                        <span className="dim" style={{ fontSize: 10 }}>{r.rewardPct}% of profit</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        r.status === 'APPROVED' ? 'badge-success'
                        : r.status === 'PAID' ? 'badge-success'
                        : r.status === 'REJECTED' ? 'badge-danger'
                        : 'badge-info'
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div className="card-lg detail">
              <div className="detail-head">
                <div>
                  <h3>{selected.id}</h3>
                  <p className="dim" style={{ fontSize: 11 }}>Passed {selected.passedAt}</p>
                </div>
                <span className="badge badge-info">Awaiting review</span>
              </div>

              <div className="detail-body">
                <div className="metric">
                  <div className="metric-lbl">Computed reward</div>
                  <div className="metric-val num">{paise(selected.computedPaise)}</div>
                  <div className="dim" style={{ fontSize: 11 }}>{selected.rewardPct}% × {paise(selected.profitPaise, { decimals: false })} profit</div>
                </div>

                <div className="section-lbl">Challenge summary</div>
                <FieldRow label="User" value={selected.user} />
                <FieldRow label="Plan" value={selected.plan} />
                <FieldRow label="Challenge" value={selected.challengeId} mono />
                <FieldRow label="Final equity" value={paise(selected.finalEquityPaise)} />
                <FieldRow label="Net profit" value={paise(selected.profitPaise)} />

                <div className="section-lbl">Override (optional)</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" type="number" placeholder={String(selected.computedPaise / 100)} value={override} onChange={(e) => setOverride(e.target.value)} />
                  <span className="dim" style={{ alignSelf: 'center', fontSize: 11 }}>₹</span>
                </div>

                <div className="section-lbl">Reason</div>
                <textarea className="input" rows={2} placeholder="Optional note for the timeline" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>

              <div className="detail-actions">
                <button className="btn btn-danger" style={{ flex: 1 }}><Icon.X size={14}/> Reject</button>
                <button className="btn btn-primary" style={{ flex: 1 }}><Icon.Check size={14}/> Approve payout</button>
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
        .detail-head h3 { font-size: 15px; font-weight: 500; font-family: var(--mono); }
        .detail-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; }
        .metric { padding: 14px; background: var(--accent-soft); border-radius: var(--r-md); margin-bottom: 6px; }
        .metric-lbl { font-size: 10px; color: var(--accent); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 4px; }
        .metric-val { font-size: 24px; font-weight: 400; letter-spacing: -0.02em; color: var(--text); }
        .section-lbl { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; margin-top: 12px; }
        .detail-actions { display: flex; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--line-soft); background: var(--panel-2); }
      `}</style>
    </>
  );
}

function FieldRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', padding: '6px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: mono ? 'var(--mono)' : undefined, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
