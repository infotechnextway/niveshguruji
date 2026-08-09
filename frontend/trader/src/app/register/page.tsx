'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AuthError, traderRegister, toE164Mobile } from '@/lib/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BrandLockup } from '@/components/BrandLogo';

type IncomeType = 'SALARIED' | 'OWN';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [incomeType, setIncomeType] = useState<IncomeType>('SALARIED');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const income = Number(monthlyIncome);
    if (!Number.isFinite(income) || income < 0 || !Number.isInteger(income)) {
      setErr('Enter a valid monthly income in whole rupees.');
      setBusy(false);
      return;
    }
    try {
      await traderRegister({
        name: name.trim(),
        email: email.trim(),
        mobile: toE164Mobile(mobile),
        username: username.trim(),
        password,
        address: address.trim(),
        incomeType,
        monthlyIncome: income,
      });
      setDone(true);
    } catch (e: unknown) {
      if (e instanceof AuthError) {
        if (e.code === 'DUPLICATE') setErr(e.message || 'An account with these details already exists.');
        else setErr(e.message);
      } else {
        setErr(e instanceof Error ? e.message : 'Registration failed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rp">
      <div className="rp-tt"><ThemeToggle /></div>
      <div className="rp-card card-lg">
        <div className="rp-brand">
          <BrandLockup height={52} />
        </div>
        {done ? (
          <>
            <h1 className="rp-title">Registration submitted</h1>
            <p className="dim" style={{ fontSize: 13, lineHeight: 1.5 }}>
              Your account is awaiting admin approval. You will be able to sign in once an administrator activates it.
            </p>
            <Link href="/login" className="btn btn-primary" style={{ padding: '10px', fontSize: 13, textAlign: 'center' }}>
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="rp-title">Create an account</h1>
            <p className="dim" style={{ fontSize: 12, marginTop: -12 }}>
              Submit your details for admin review. Login is enabled after approval.
            </p>
            <form onSubmit={submit} className="vstack gap-3">
              <div className="grid-2">
                <div className="vstack gap-1">
                  <label className="lbl">Full name</label>
                  <input className="input" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul Sharma" autoComplete="name" />
                </div>
                <div className="vstack gap-1">
                  <label className="lbl">Username</label>
                  <input className="input" required pattern="[a-zA-Z0-9_]{4,30}" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="rahul_s" autoComplete="username" />
                </div>
              </div>
              <div className="grid-2">
                <div className="vstack gap-1">
                  <label className="lbl">Email</label>
                  <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                </div>
                <div className="vstack gap-1">
                  <label className="lbl">Mobile</label>
                  <input className="input" required inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9876543210" autoComplete="tel" />
                </div>
              </div>
              <div className="vstack gap-1">
                <label className="lbl">Password</label>
                <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars, upper, lower, digit" autoComplete="new-password" />
              </div>
              <div className="vstack gap-1">
                <label className="lbl">Address</label>
                <textarea className="input" required minLength={5} maxLength={500} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House / street, city, state, PIN" style={{ resize: 'vertical' }} />
              </div>
              <div className="grid-2">
                <div className="vstack gap-1">
                  <label className="lbl">Income type</label>
                  <select className="input" value={incomeType} onChange={(e) => setIncomeType(e.target.value as IncomeType)}>
                    <option value="SALARIED">Salaried</option>
                    <option value="OWN">Own business / self-employed</option>
                  </select>
                </div>
                <div className="vstack gap-1">
                  <label className="lbl">{incomeType === 'SALARIED' ? 'Monthly salary (₹)' : 'Monthly income (₹)'}</label>
                  <input className="input" type="number" required min={0} step={1} value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} placeholder="85000" />
                </div>
              </div>
              {err && <div className="err">{err}</div>}
              <button className="btn btn-primary" style={{ padding: '10px', fontSize: 13 }} disabled={busy}>
                {busy ? 'Submitting…' : 'Submit for approval'}
              </button>
            </form>
            <p className="dim" style={{ textAlign: 'center', fontSize: 11, marginTop: 4 }}>
              Already registered? <Link href="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
            </p>
          </>
        )}
      </div>
      <style jsx>{`
        .rp { min-height: 100vh; display: grid; place-items: center; background: var(--bg); padding: 24px; position: relative; }
        .rp-tt { position: absolute; top: 24px; right: 24px; }
        .rp-card { width: 100%; max-width: 520px; padding: 32px; display: flex; flex-direction: column; gap: 16px; }
        .rp-brand { display: flex; align-items: center; padding-bottom: 8px; }
        .rp-title { font-size: 22px; font-weight: 500; letter-spacing: -0.01em; }
        .lbl { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; }
        .err { padding: 8px 12px; background: var(--loss-soft); color: var(--loss); border-radius: var(--r); font-size: 12px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 560px) { .grid-2 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
