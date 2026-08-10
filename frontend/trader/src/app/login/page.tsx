'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { traderLogin, fetchTraderProfile, AuthError, setSession, enterDemoMode, exitDemoMode } from '@/lib/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BrandLockup } from '@/components/BrandLogo';

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  if (raw.startsWith('/admin')) return '/dashboard';
  return raw;
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNext(searchParams.get('next'));
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const result = await traderLogin(identifier, password);
      const profile = await fetchTraderProfile(result.accessToken);
      exitDemoMode();
      setSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: {
          id: profile._id,
          name: profile.name || profile.username || identifier.split('@')[0] || 'Trader',
          email: profile.email || identifier,
          role: 'user',
        },
      });
      router.push(nextPath);
    } catch (e: unknown) {
      if (e instanceof AuthError) {
        if (e.code === 'AUTH_FAILED') {
          setErr('Invalid email/username or password.');
        } else if (e.code === 'SUSPENDED') {
          setErr('Account suspended. Contact support.');
        } else if (e.code === 'APPROVAL_PENDING') {
          setErr('Your account is awaiting admin approval. Try again after it is activated.');
        } else if (e.code === 'REJECTED') {
          setErr('Registration was not approved. Contact support.');
        } else if (e.code === 'VERIFICATION_PENDING') {
          setErr('Complete mobile and email verification before signing in.');
        } else {
          setErr(e.message);
        }
      } else {
        setErr(e instanceof Error ? e.message : 'Sign-in failed');
      }
      setBusy(false);
    }
  }

  function demo() {
    setBusy(true);
    enterDemoMode();
    router.push('/dashboard');
  }

  return (
    <div className="lp">
      <div className="lp-tt"><ThemeToggle /></div>
      <div className="lp-card card-lg">
        <div className="lp-brand">
          <BrandLockup height={52} />
        </div>
        <h1 className="lp-title">Welcome back</h1>
        <p className="dim" style={{ fontSize: 12, marginTop: -12 }}>Sign in to continue your evaluation.</p>
        <form onSubmit={signIn} className="vstack gap-3">
          <div className="vstack gap-1">
            <label className="lbl">Email or username</label>
            <input className="input" type="text" required autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="vstack gap-1">
            <label className="lbl">Password</label>
            <input className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {err && <div className="err">{err}</div>}
          <button className="btn btn-primary" style={{ padding: '10px', fontSize: 13 }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="lp-sep"><span>or</span></div>
        <button className="btn btn-secondary" style={{ padding: '10px', fontSize: 13 }} onClick={demo} disabled={busy}>
          {busy ? 'Opening…' : 'Try the demo dashboard'}
        </button>
        <p className="dim" style={{ textAlign: 'center', fontSize: 11, marginTop: 8 }}>
          New here? <a href="/register" style={{ color: 'var(--accent)' }}>Create an account</a>
          {' · '}
          <a href="/admin/login" style={{ color: 'var(--accent)' }}>Admin</a>
        </p>
      </div>
      <style jsx>{`
        .lp { min-height: 100vh; display: grid; place-items: center; background: var(--bg); padding: 16px; position: relative; overflow-x: hidden; width: 100%; }
        .lp-tt { position: absolute; top: 16px; right: 16px; z-index: 2; }
        .lp-card { width: 100%; max-width: 400px; padding: 24px; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .lp-brand { display: flex; align-items: center; padding-bottom: 8px; max-width: 100%; overflow: hidden; }
        .lp-title { font-size: 22px; font-weight: 500; letter-spacing: -0.01em; }
        .lbl { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; }
        .err { padding: 8px 12px; background: var(--loss-soft); color: var(--loss); border-radius: var(--r); font-size: 12px; }
        .lp-sep { display: flex; align-items: center; gap: 12px; margin: 4px 0; color: var(--text-faint); font-size: 11px; }
        .lp-sep::before, .lp-sep::after { content: ''; flex: 1; height: 1px; background: var(--line-soft); }
        @media (max-width: 420px) {
          .lp { padding: 12px; align-items: start; padding-top: 56px; }
          .lp-card { padding: 20px 16px; }
          .lp-title { font-size: 20px; }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
