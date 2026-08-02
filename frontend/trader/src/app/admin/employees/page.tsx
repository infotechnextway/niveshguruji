'use client';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { Icon } from '@/components/Icons';

const ROLES = [
  { key: 'super_admin', label: 'Super admin', desc: 'Full access. Configuration, employees, billing.' },
  { key: 'admin', label: 'Admin', desc: 'User management, plans, rewards. Not employees/config.' },
  { key: 'kyc_reviewer', label: 'KYC reviewer', desc: 'Approve/reject KYC. Read users. Nothing else.' },
  { key: 'reward_approver', label: 'Reward approver', desc: 'Approve/reject rewards. Read challenges. Nothing else.' },
  { key: 'support', label: 'Support', desc: 'Read-only across users and orders. Cannot modify state.' },
  { key: 'read_only', label: 'Read-only', desc: 'Read everything, mutate nothing.' },
];

const EMPLOYEES = [
  { id: 'E-101', name: 'Anita Kulkarni', email: 'anita.k@nextway.co', role: 'super_admin', mfa: true, lastActive: '2 minutes ago' },
  { id: 'E-102', name: 'Rohan Verma', email: 'rohan.v@nextway.co', role: 'admin', mfa: true, lastActive: '1 hour ago' },
  { id: 'E-103', name: 'Sanya Kapoor', email: 'sanya.k@nextway.co', role: 'kyc_reviewer', mfa: true, lastActive: 'Yesterday' },
  { id: 'E-104', name: 'Deepak Nair', email: 'deepak.n@nextway.co', role: 'reward_approver', mfa: false, lastActive: '2 days ago' },
];

export default function EmployeesPage() {
  return (
    <>
      <AdminTopbar title="Employees & RBAC" subtitle="Internal staff and their access."
        actions={<button className="btn btn-primary">+ Invite employee</button>} />
      <div className="admin-body">
        <div className="grid-2">
          <div className="card-lg" style={{ padding: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 500 }}>Employees ({EMPLOYEES.length})</h3>
            </div>
            <table className="table">
              <thead><tr><th>Employee</th><th>Role</th><th>MFA</th><th>Last active</th><th></th></tr></thead>
              <tbody>
                {EMPLOYEES.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="vstack">
                        <span style={{ fontWeight: 500 }}>{e.name}</span>
                        <span className="dim" style={{ fontSize: 11 }}>{e.email}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-info">{ROLES.find(r => r.key === e.role)?.label}</span></td>
                    <td>{e.mfa ? <span className="badge badge-success"><Icon.Check size={10}/> On</span> : <span className="badge badge-warn">Off</span>}</td>
                    <td className="dim" style={{ fontSize: 11 }}>{e.lastActive}</td>
                    <td className="r"><button className="btn btn-ghost">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card-lg" style={{ padding: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 500 }}>Roles</h3>
              <p className="dim" style={{ fontSize: 11, marginTop: 2 }}>Deny-wins RBAC. Each employee has exactly one role.</p>
            </div>
            <div>
              {ROLES.map((r) => (
                <div key={r.key} className="role-row">
                  <div><div style={{ fontWeight: 500, fontSize: 13 }}>{r.label}</div><div className="dim" style={{ fontSize: 11 }}>{r.desc}</div></div>
                  <button className="btn btn-ghost">Permissions</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .grid-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: start; }
        .role-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--line-soft); }
        .role-row:last-child { border-bottom: none; }
      `}</style>
    </>
  );
}
