'use client';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { Icon } from '@/components/Icons';
import { paise } from '@/lib/format';

const USERS = [
  { id: 'U-8291', name: 'Rahul Sharma', email: 'rahul.sharma@gmail.com', kyc: 'APPROVED', activeChallenge: 'Evaluator ₹10L', equityPaise: 10_28_720_00, joinedAt: '15 Jul' },
  { id: 'U-8290', name: 'Priya Menon', email: 'priya.m@outlook.com', kyc: 'APPROVED', activeChallenge: 'Evaluator ₹5L', equityPaise: 5_12_400_00, joinedAt: '14 Jul' },
  { id: 'U-8289', name: 'Arjun Patel', email: 'arjun.p@gmail.com', kyc: 'APPROVED', activeChallenge: '—', equityPaise: 0, joinedAt: '10 Jul' },
  { id: 'U-8288', name: 'Meera Iyer', email: 'meera.iyer@yahoo.in', kyc: 'PENDING', activeChallenge: '—', equityPaise: 0, joinedAt: '31 Jul' },
];

export default function UsersPage() {
  return (
    <>
      <AdminTopbar
        title="Users"
        subtitle="1,247 registered · 843 active"
        actions={
          <>
            <button className="btn btn-secondary"><Icon.Search size={14}/> Search</button>
            <button className="btn btn-secondary">Export</button>
          </>
        }
      />
      <div className="admin-body">
        <div className="card-lg" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>User</th><th>Contact</th><th>KYC</th>
                <th>Active challenge</th><th className="r">Equity</th><th>Joined</th><th></th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="hstack gap-3">
                      <span className="avatar-md">{u.name.split(' ').map(s => s[0]).slice(0,2).join('')}</span>
                      <div className="vstack">
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                        <span className="dim num" style={{ fontSize: 10 }}>{u.id}</span>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontSize: 12 }}>{u.email}</span></td>
                  <td>
                    <span className={`badge ${u.kyc === 'APPROVED' ? 'badge-success' : 'badge-warn'}`}>{u.kyc}</span>
                  </td>
                  <td>{u.activeChallenge}</td>
                  <td className="r num">{u.equityPaise ? paise(u.equityPaise) : '—'}</td>
                  <td className="dim">{u.joinedAt}</td>
                  <td className="r">
                    <button className="btn btn-ghost">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style jsx>{`
        .avatar-md { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent-hover)); color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 600; }
      `}</style>
    </>
  );
}
