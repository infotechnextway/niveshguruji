'use client';
import Link from 'next/link';
import { BrandMark } from './BrandLogo';

export function Navbar() {
  return (
    <header className="ng-nav" style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(240,165,30,0.08)',
    }}>
      <div className="ng-container" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', maxWidth: 1280, margin: '0 auto',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <BrandMark size={32} />
          <span style={{
            fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em',
            background: 'linear-gradient(to right, #f0a51e, #fbbf24)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>NIVESH GURU</span>
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {[
            { href: '/challenges', label: 'Programs' },
            { href: '/how-it-works', label: 'How it works' },
            { href: '/payouts', label: 'Payouts' },
            { href: '/contact', label: 'Contact' },
          ].map((l) => (
            <Link key={l.href} href={l.href} style={{
              color: 'rgba(241,245,249,0.7)', fontSize: 14, fontWeight: 500,
              textDecoration: 'none', transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fbbf24')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(241,245,249,0.7)')}
            >{l.label}</Link>
          ))}
        </nav>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/login" style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            color: 'rgba(241,245,249,0.8)', border: '1px solid rgba(240,165,30,0.2)',
            textDecoration: 'none', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(240,165,30,0.5)'; e.currentTarget.style.color = '#fbbf24'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(240,165,30,0.2)'; e.currentTarget.style.color = 'rgba(241,245,249,0.8)'; }}
          >Login</Link>
          <Link href="/register" style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            background: 'linear-gradient(135deg, #f0a51e, #d4901a)', color: '#030712',
            textDecoration: 'none', transition: 'all 0.2s',
          }}>Get started</Link>
        </div>
      </div>
    </header>
  );
}
