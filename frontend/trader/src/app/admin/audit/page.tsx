'use client';
import { AdminTopbar } from '@/components/admin/AdminTopbar';

const AUDIT = [
  { id: 'A-49281', at: '31 Jul, 14:22:15', actor: 'Anita Kulkarni', action: 'reward.approve', target: 'R-402', delta: 'status: ELIGIBLE → APPROVED' },
  { id: 'A-49280', at: '31 Jul, 14:18:03', actor: 'Sanya Kapoor', action: 'kyc.approve', target: 'K-8290', delta: 'status: UNDER_REVIEW → APPROVED' },
  { id: 'A-49279', at: '31 Jul, 14:12:44', actor: 'Rohan Verma', action: 'plan.update', target: 'PL-03', delta: 'rewardPct: 75 → 80' },
  { id: 'A-49278', at: '31 Jul, 13:55:20', actor: 'Anita Kulkarni', action: 'config.set', target: 'trading.slippage.bps', delta: '2 → 0' },
  { id: 'A-49277', at: '31 Jul, 13:42:11', actor: 'Deepak Nair', action: 'reward.reject', target: 'R-399', delta: 'reason: "Suspicious pattern"' },
  { id: 'A-49276', at: '31 Jul, 12:30:00', actor: 'Anita Kulkarni', action: 'employee.invite', target: 'newperson@nextway.co', delta: 'role: support' },
];

export default function AuditPage() {
  return (
    <>
      <AdminTopbar title="Audit log" subtitle="Immutable record of every admin action. Write-once."
        actions={<button className="btn btn-secondary">Export</button>} />
      <div className="admin-body">
        <div className="card-lg" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>ID</th><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Change</th></tr></thead>
            <tbody>
              {AUDIT.map((a) => (
                <tr key={a.id}>
                  <td className="num" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{a.id}</td>
                  <td className="num dim">{a.at}</td>
                  <td>{a.actor}</td>
                  <td><code style={{ fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 3 }}>{a.action}</code></td>
                  <td className="num" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{a.target}</td>
                  <td className="dim" style={{ fontSize: 11 }}>{a.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
