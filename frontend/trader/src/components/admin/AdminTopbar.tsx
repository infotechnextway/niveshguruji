'use client';
import { Icon } from '../Icons';
import { ThemeToggle } from '../ThemeToggle';
import { getEmployeeSession } from '@/lib/auth';

export function AdminTopbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode; }) {
  const session = getEmployeeSession();
  const initials = (session?.user.name ?? 'Admin').slice(0, 2).toUpperCase();
  const displayName = session?.user.name ?? 'Admin';
  const displayRole = session?.user.email ?? 'Sign in required';

  return (
    <div className="tb">
      <div className="tb-left">
        <h1 className="tb-title">{title}</h1>
        {subtitle && <p className="tb-sub dim">{subtitle}</p>}
      </div>
      <div className="tb-right">
        {actions}
        <div className="tb-sep"/>
        <ThemeToggle />
        <button className="tb-icon" aria-label="Notifications"><Icon.Bell size={15}/></button>
        <div className="tb-user">
          <span className="avatar">{initials}</span>
          <div className="vstack">
            <span className="tb-name">{displayName}</span>
            <span className="tb-role">{displayRole}</span>
          </div>
        </div>
      </div>
      <style jsx>{`
        .tb { display: flex; justify-content: space-between; align-items: center; padding: 16px 32px; background: var(--panel); border-bottom: 1px solid var(--line); }
        .tb-title { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; }
        .tb-sub { font-size: 12px; margin-top: 2px; }
        .tb-right { display: flex; align-items: center; gap: 8px; }
        .tb-sep { width: 1px; height: 20px; background: var(--line); margin: 0 4px; }
        .tb-icon { display: grid; place-items: center; width: 32px; height: 32px; color: var(--text-dim); border-radius: var(--r); }
        .tb-icon:hover { color: var(--text); background: var(--panel-2); }
        .tb-user { display: flex; align-items: center; gap: 10px; padding: 4px 12px 4px 4px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 999px; }
        .avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent-hover)); color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 600; }
        .tb-name { font-size: 12px; color: var(--text); font-weight: 500; line-height: 1.2; }
        .tb-role { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; line-height: 1.2; }
      `}</style>
    </div>
  );
}
