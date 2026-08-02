'use client';
import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme';
import { Icon } from './Icons';

/** Defer icon until after mount so SSR (always "light") never mismatches a
 *  client that already applied dark via the head script. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const light = !ready || theme === 'light';
  return (
    <button className="tt" onClick={toggle} aria-label={`Switch to ${light ? 'dark' : 'light'} mode`} title="Toggle theme">
      {light ? <Icon.Moon size={16} /> : <Icon.Sun size={16} />}
      <style jsx>{`
        .tt {
          display: grid; place-items: center;
          width: 40px; height: 40px; min-width: 40px; min-height: 40px;
          border-radius: var(--r); color: var(--text-dim);
          transition: color 0.1s, background 0.1s;
        }
        .tt:hover { color: var(--text); background: var(--panel-2); }
        @media (max-width: 900px) {
          .tt { width: 44px; height: 44px; min-width: 44px; min-height: 44px; }
        }
      `}</style>
    </button>
  );
}
