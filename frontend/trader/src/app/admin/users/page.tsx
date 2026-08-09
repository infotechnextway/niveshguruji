'use client';
import { useCallback, useEffect, useState } from 'react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { Icon } from '@/components/Icons';
import { api, ApiError } from '@/lib/api';

type UserStatus =
  | 'PENDING_MOBILE'
  | 'PENDING_EMAIL'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  username: string;
  address?: string;
  incomeType?: 'SALARIED' | 'OWN';
  monthlyIncome?: number;
  status: UserStatus;
  kycStatus: string;
  createdAt?: string;
  rejectionReason?: string;
}

interface UserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

type Tab = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'ALL';

function statusBadge(status: UserStatus): string {
  if (status === 'ACTIVE') return 'badge-success';
  if (status === 'PENDING_APPROVAL') return 'badge-warn';
  if (status === 'REJECTED' || status === 'SUSPENDED') return 'badge-danger';
  return 'badge';
}

function formatIncome(u: AdminUser): string {
  if (u.monthlyIncome == null) return '—';
  const kind = u.incomeType === 'OWN' ? 'Own' : u.incomeType === 'SALARIED' ? 'Salaried' : '';
  return `${kind ? `${kind} · ` : ''}₹${u.monthlyIncome.toLocaleString('en-IN')}`;
}

function joinedLabel(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('PENDING_APPROVAL');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '50' });
      if (tab !== 'ALL') params.set('status', tab);
      if (q.trim()) params.set('search', q.trim());
      const data = await api<UserListResponse>(`/admin/users?${params}`);
      setItems(data.items);
      setTotal(data.total);
      setSelected((prev) => (prev ? data.items.find((u) => u._id === prev._id) ?? null : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [tab, q]);

  useEffect(() => { void load(); }, [load]);

  async function approve(user: AdminUser) {
    setBusyId(user._id);
    setError('');
    try {
      await api(`/admin/users/${user._id}/approve`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Approve failed');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(user: AdminUser) {
    const reason = rejectReason.trim();
    if (reason.length < 5) {
      setError('Rejection reason must be at least 5 characters.');
      return;
    }
    setBusyId(user._id);
    setError('');
    try {
      await api(`/admin/users/${user._id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setRejectReason('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reject failed');
    } finally {
      setBusyId(null);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'PENDING_APPROVAL', label: 'Pending approval' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'ALL', label: 'All' },
  ];

  return (
    <>
      <AdminTopbar
        title="Users"
        subtitle={`${total} matching · approve registrations to enable login`}
        actions={
          <form
            className="hstack gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(search);
            }}
          >
            <input
              className="input"
              style={{ width: 220 }}
              placeholder="Search name, email, mobile…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary"><Icon.Search size={14} /> Search</button>
          </form>
        }
      />
      <div className="admin-body">
        <div className="tabs">
          {tabs.map((t) => (
            <button key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => { setTab(t.key); setSelected(null); }}>
              <span className="tab-cap">{t.label}</span>
            </button>
          ))}
        </div>

        {error && <div className="err-banner">{error}</div>}

        <div className="split">
          <div className="card-lg" style={{ padding: 0 }}>
            {loading ? (
              <div className="pad dim">Loading users…</div>
            ) : items.length === 0 ? (
              <div className="pad dim">No users in this view.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Contact</th>
                    <th>Income</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => (
                    <tr
                      key={u._id}
                      onClick={() => setSelected(u)}
                      style={{ cursor: 'pointer' }}
                      className={selected?._id === u._id ? 'row-active' : ''}
                    >
                      <td>
                        <div className="hstack gap-3">
                          <span className="avatar-md">{u.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}</span>
                          <div className="vstack">
                            <span style={{ fontWeight: 500 }}>{u.name}</span>
                            <span className="dim num" style={{ fontSize: 10 }}>@{u.username}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="vstack">
                          <span style={{ fontSize: 12 }}>{u.email}</span>
                          <span className="dim num" style={{ fontSize: 11 }}>{u.mobile}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{formatIncome(u)}</td>
                      <td><span className={`badge ${statusBadge(u.status)}`}>{u.status.replace(/_/g, ' ')}</span></td>
                      <td className="dim">{joinedLabel(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card-lg detail">
            {!selected ? (
              <p className="dim" style={{ fontSize: 13 }}>Select a user to review registration details.</p>
            ) : (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 560, marginBottom: 4 }}>{selected.name}</h2>
                <p className="dim num" style={{ fontSize: 11, marginBottom: 16 }}>@{selected.username}</p>
                <dl className="meta">
                  <div><dt>Email</dt><dd>{selected.email}</dd></div>
                  <div><dt>Mobile</dt><dd className="num">{selected.mobile}</dd></div>
                  <div><dt>Address</dt><dd>{selected.address || '—'}</dd></div>
                  <div><dt>Income</dt><dd>{formatIncome(selected)}</dd></div>
                  <div><dt>Status</dt><dd><span className={`badge ${statusBadge(selected.status)}`}>{selected.status.replace(/_/g, ' ')}</span></dd></div>
                  <div><dt>KYC</dt><dd>{selected.kycStatus.replace(/_/g, ' ')}</dd></div>
                  <div><dt>Joined</dt><dd>{joinedLabel(selected.createdAt)}</dd></div>
                  {selected.rejectionReason && (
                    <div><dt>Rejection</dt><dd>{selected.rejectionReason}</dd></div>
                  )}
                </dl>

                {selected.status === 'PENDING_APPROVAL' && (
                  <div className="vstack gap-2" style={{ marginTop: 20 }}>
                    <button
                      className="btn btn-primary"
                      disabled={busyId === selected._id}
                      onClick={() => void approve(selected)}
                    >
                      {busyId === selected._id ? 'Working…' : 'Approve & enable login'}
                    </button>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Rejection reason (required to reject)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <button
                      className="btn btn-secondary"
                      disabled={busyId === selected._id}
                      onClick={() => void reject(selected)}
                    >
                      Reject registration
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .avatar-md { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent-hover)); color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 600; flex-shrink: 0; }
        .tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
        .tab { border: 1px solid var(--line); background: var(--panel); color: var(--text-dim); padding: 6px 12px; border-radius: var(--r); font-size: 12px; cursor: pointer; }
        .tab.on { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
        .tab-cap { text-transform: capitalize; }
        .split { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; align-items: start; }
        @media (max-width: 960px) { .split { grid-template-columns: 1fr; } }
        .pad { padding: 24px; }
        .detail { padding: 20px; }
        .meta { display: grid; gap: 10px; margin: 0; }
        .meta div { display: grid; grid-template-columns: 88px 1fr; gap: 8px; font-size: 12px; }
        .meta dt { color: var(--text-dim); margin: 0; }
        .meta dd { margin: 0; }
        .err-banner { margin-bottom: 12px; padding: 8px 12px; background: var(--loss-soft); color: var(--loss); border-radius: var(--r); font-size: 12px; }
        :global(.row-active) { background: var(--accent-soft); }
        :global(.badge-danger) { background: var(--loss-soft); color: var(--loss); }
      `}</style>
    </>
  );
}
