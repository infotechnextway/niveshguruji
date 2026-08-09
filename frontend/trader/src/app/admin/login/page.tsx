'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminLogin, AuthError, setEmployeeSession } from '@/lib/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BrandLockup } from '@/components/BrandLogo';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin/kyc';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const result = await adminLogin(email, password, needsTotp ? totpCode : undefined);
      setEmployeeSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: {
          id: 'employee',
          name: email.split('@')[0] || 'Admin',
          email: email.toLowerCase(),
          role: 'employee',
        },
      });
      router.push(next.startsWith('/admin') ? next : '/admin/kyc');
    } catch (e: unknown) {
      if (e instanceof AuthError) {
        if (e.code === 'TOTP_REQUIRED') {
          setNeedsTotp(true);
          setErr('Enter the 6-digit code from your authenticator app.');
        } else if (e.code === 'AUTH_FAILED' || e.code === 'TOTP_INVALID') {
          setErr(e.code === 'TOTP_INVALID' ? 'Incorrect authenticator code.' : 'Invalid email or password.');
        } else {
          setErr(e.message);
        }
      } else {
        setErr(e instanceof Error ? e.message : 'Sign-in failed');
      }
      setBusy(false);
    }
  }

  return (
    <div className="alp">
      <div className="alp-tt"><ThemeToggle /></div>
      <div className="alp-card card-lg">
        <div className="alp-brand">
          <BrandLockup height={52} />
          <span className="brand-tag">Admin console</span>
        </div>
        <h1 className="alp-title">Admin sign in</h1>
        <p className="dim" style={{ fontSize: 12, marginTop: -12 }}>
          Access KYC, users, instruments, and system configuration.
        </p>
        <form onSubmit={signIn} className="vstack gap-3">
          <div className="vstack gap-1">
            <label className="lbl">Email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@niveshguru.local"
              autoComplete="username"
            />
          </div>
          <div className="vstack gap-1">
            <label className="lbl">Password</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {needsTotp && (
            <div className="vstack gap-1">
              <label className="lbl">Authenticator code</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
              />
            </div>
          )}
          {err && <div className="err">{err}</div>}
          <button className="btn btn-primary" style={{ padding: '10px', fontSize: 13 }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in to admin'}
          </button>
        </form>
        <p className="dim" style={{ textAlign: 'center', fontSize: 11, marginTop: 8 }}>
          Trader account? <a href="/login" style={{ color: 'var(--accent)' }}>Go to trader login</a>
        </p>
      </div>
      <style jsx>{`
        .alp {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: var(--bg);
          padding: 24px;
          position: relative;
        }
        .alp-tt { position: absolute; top: 24px; right: 24px; }
        .alp-card {
          width: 100%;
          max-width: 400px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .alp-brand { display: flex; align-items: center; gap: 12px; padding-bottom: 8px; }
        .brand-mark {
          width: 32px; height: 32px; border-radius: 8px;
          background: linear-gradient(135deg, var(--accent), var(--accent-hover));
          position: relative;
        }
        .brand-mark::after {
          content: '';
          position: absolute;
          inset: 7px 7px auto auto;
          width: 6px; height: 6px;
          background: var(--panel);
          border-radius: 50%;
        }
        .brand-name { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
        .brand-tag {
          font-size: 10px; color: var(--text-dim);
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .alp-title { font-size: 22px; font-weight: 500; letter-spacing: -0.01em; }
        .lbl {
          font-size: 11px; color: var(--text-dim);
          text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500;
        }
        .err {
          padding: 8px 12px;
          background: var(--loss-soft);
          color: var(--loss);
          border-radius: var(--r);
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
