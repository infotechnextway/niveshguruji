'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { traderLogin, fetchTraderProfile, AuthError, setSession, enterDemoMode, exitDemoMode } from '@/lib/auth';
import { ThemeToggle } from '@/components/ThemeToggle';

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
          <img className="brand-mark" src="/icons/icon-192.png" alt="" width={36} height={36} />
          <div className="vstack">
            <span className="brand-name">NIVESH<span className="brand-guru">GURU</span></span>
            <span className="brand-tag">Investment simplified · Paper trading</span>
          </div>
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
          New here? <a href="#" style={{ color: 'var(--accent)' }}>Create an account</a>
          {' · '}
          <a href="/admin/login" style={{ color: 'var(--accent)' }}>Admin</a>
        </p>
      </div>
      <style jsx>{`
        .lp { min-height: 100vh; display: grid; place-items: center; background: var(--bg); padding: 24px; position: relative; }
        .lp-tt { position: absolute; top: 24px; right: 24px; }
        .lp-card { width: 100%; max-width: 400px; padding: 32px; display: flex; flex-direction: column; gap: 16px; }
        .lp-brand { display: flex; align-items: center; gap: 12px; padding-bottom: 8px; }
        .brand-mark { width: 36px; height: 36px; border-radius: 9px; display: block; object-fit: cover; }
        .brand-name { font-size: 16px; font-weight: 700; letter-spacing: 0.04em; }
        .brand-guru { color: var(--brand-gold, #C69C27); }
        .brand-tag { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.06em; }
        .lp-title { font-size: 22px; font-weight: 500; letter-spacing: -0.01em; }
        .lbl { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; }
        .err { padding: 8px 12px; background: var(--loss-soft); color: var(--loss); border-radius: var(--r); font-size: 12px; }
        .lp-sep { display: flex; align-items: center; gap: 12px; margin: 4px 0; color: var(--text-faint); font-size: 11px; }
        .lp-sep::before, .lp-sep::after { content: ''; flex: 1; height: 1px; background: var(--line-soft); }
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
