'use client';
import { useState } from 'react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { Icon } from '@/components/Icons';

interface KYC {
  id: string; name: string; email: string; mobile: string;
  submittedAt: string; status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  pan: string; docs: number;
}
const DEMO: KYC[] = [
  { id: 'K-8291', name: 'Rahul Sharma', email: 'rahul.sharma@gmail.com', mobile: '+91 98… 1204', submittedAt: '31 Jul, 11:42', status: 'SUBMITTED', pan: 'ABCDE1234F', docs: 3 },
  { id: 'K-8290', name: 'Priya Menon', email: 'priya.m@outlook.com', mobile: '+91 87… 9982', submittedAt: '31 Jul, 10:15', status: 'UNDER_REVIEW', pan: 'PQRST5678G', docs: 3 },
  { id: 'K-8289', name: 'Arjun Patel', email: 'arjun.p@gmail.com', mobile: '+91 99… 3421', submittedAt: '31 Jul, 09:03', status: 'SUBMITTED', pan: 'LMNOP9012H', docs: 3 },
  { id: 'K-8288', name: 'Meera Iyer', email: 'meera.iyer@yahoo.in', mobile: '+91 90… 7788', submittedAt: '30 Jul, 22:14', status: 'SUBMITTED', pan: 'FGHIJ3456K', docs: 3 },
  { id: 'K-8287', name: 'Vikram Rao', email: 'vikram.rao@gmail.com', mobile: '+91 96… 5533', submittedAt: '30 Jul, 20:41', status: 'REJECTED', pan: 'STUVW7890L', docs: 2 },
];

export default function KYCQueue() {
  const [tab, setTab] = useState<'pending' | 'review' | 'approved' | 'rejected'>('pending');
  const [selected, setSelected] = useState<KYC | null>(null);
  const filtered = DEMO.filter((k) =>
    tab === 'pending' ? k.status === 'SUBMITTED'
    : tab === 'review' ? k.status === 'UNDER_REVIEW'
    : tab === 'approved' ? k.status === 'APPROVED'
    : k.status === 'REJECTED');

  return (
    <>
      <AdminTopbar
        title="KYC review"
        subtitle="Verify identity documents submitted by users."
        actions={
          <div className="hstack gap-2">
            <button className="btn btn-secondary">Export CSV</button>
          </div>
        }
      />
      <div className="admin-body">
        <div className="tabs">
          {(['pending', 'review', 'approved', 'rejected'] as const).map((t) => (
            <button key={t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              <span className="tab-cap">{t}</span>
              {t === 'pending' && <span className="tab-count">12</span>}
              {t === 'review' && <span className="tab-count">3</span>}
              {t === 'approved' && <span className="tab-count">240</span>}
              {t === 'rejected' && <span className="tab-count">18</span>}
            </button>
          ))}
        </div>

        <div className="split">
          <div className="card-lg" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Applicant</th><th>Contact</th><th>PAN</th>
                  <th>Submitted</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k) => (
                  <tr key={k.id} onClick={() => setSelected(k)} style={{ cursor: 'pointer' }} className={selected?.id === k.id ? 'row-active' : ''}>
                    <td>
                      <div className="vstack">
                        <span style={{ fontWeight: 500 }}>{k.name}</span>
                        <span className="dim" style={{ fontSize: 10, fontFamily: 'var(--mono)' }}>{k.id}</span>
                      </div>
                    </td>
                    <td>
                      <div className="vstack">
                        <span style={{ fontSize: 12 }}>{k.email}</span>
                        <span className="dim num" style={{ fontSize: 11 }}>{k.mobile}</span>
                      </div>
                    </td>
                    <td className="num">{k.pan}</td>
                    <td className="num dim">{k.submittedAt}</td>
                    <td>
                      <span className={`badge ${
                        k.status === 'APPROVED' ? 'badge-success'
                        : k.status === 'REJECTED' ? 'badge-danger'
                        : k.status === 'UNDER_REVIEW' ? 'badge-warn'
                        : 'badge-info'
                      }`}>{k.status.replace('_', ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected ? (
            <div className="card-lg detail">
              <div className="detail-head">
                <div>
                  <h3>{selected.name}</h3>
                  <p className="dim" style={{ fontSize: 12 }}>{selected.id} · Submitted {selected.submittedAt}</p>
                </div>
                <button className="btn btn-ghost" onClick={() => setSelected(null)}><Icon.X size={14}/></button>
              </div>
              <div className="detail-body">
                <FieldRow label="Email" value={selected.email} />
                <FieldRow label="Mobile" value={selected.mobile} />
                <FieldRow label="PAN" value={selected.pan} mono />
                <FieldRow label="Documents" value={`${selected.docs} files uploaded`} />
                <div style={{ marginTop: 12 }}>
                  <div className="dim" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Documents</div>
                  <div className="docs">
                    {['PAN card', 'Aadhaar (front)', 'Aadhaar (back)', 'Selfie'].slice(0, selected.docs + 1).map((d) => (
                      <div key={d} className="doc"><Icon.FileText size={14}/> {d}<a href="#">View</a></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="detail-actions">
                <button className="btn btn-danger" style={{ flex: 1 }}><Icon.X size={14}/> Reject</button>
                <button className="btn btn-success" style={{ flex: 1 }}><Icon.Check size={14}/> Approve</button>
              </div>
            </div>
          ) : (
            <div className="card-lg empty">
              <Icon.Shield size={32}/>
              <div>Select an applicant to review</div>
              <div className="dim" style={{ fontSize: 11 }}>Their submission opens in the side panel with all documents.</div>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .tabs { display: flex; gap: 4px; margin-bottom: 20px; }
        .tab { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--panel);
          border: 1px solid var(--line); border-radius: var(--r); font-size: 12px; color: var(--text-dim); text-transform: capitalize; }
        .tab:hover { color: var(--text); }
        .tab.on { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
        .tab-count { padding: 1px 6px; background: var(--panel-2); border-radius: 8px; font-size: 10px; font-weight: 600; }
        .tab.on .tab-count { background: var(--accent); color: #fff; }
        .split { display: grid; grid-template-columns: 1fr 400px; gap: 16px; align-items: start; }
        .table tbody tr.row-active { background: var(--accent-soft); }
        .detail { padding: 0; overflow: hidden; position: sticky; top: 88px; }
        .detail-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--line-soft); }
        .detail-head h3 { font-size: 15px; font-weight: 500; }
        .detail-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; }
        .docs { display: flex; flex-direction: column; gap: 6px; }
        .doc { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--panel-2); border: 1px solid var(--line-soft); border-radius: var(--r); font-size: 12px; }
        .doc a { margin-left: auto; font-size: 11px; }
        .detail-actions { display: flex; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--line-soft); background: var(--panel-2); }
        .empty { padding: 60px 20px; text-align: center; color: var(--text-faint); display: flex; flex-direction: column; align-items: center; gap: 8px; }
      `}</style>
    </>
  );
}

function FieldRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', padding: '6px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: mono ? 'var(--mono)' : undefined }}>{value}</span>
    </div>
  );
}
