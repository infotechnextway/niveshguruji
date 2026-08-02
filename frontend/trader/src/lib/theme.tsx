'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
interface Ctx { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }
const ThemeCtx = createContext<Ctx>({ theme: 'light', toggle: () => {}, setTheme: () => {} });

/** Applies the theme early via a script in <head> to prevent a flash on load,
 *  then persists changes to localStorage. Respects prefers-color-scheme when
 *  the user hasn't chosen. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    // Prefer what the boot script already painted on <html>, then localStorage.
    const painted = document.documentElement.getAttribute('data-theme') as Theme | null;
    const saved = localStorage.getItem('pts_theme') as Theme | null;
    const initial: Theme =
      painted === 'dark' || painted === 'light'
        ? painted
        : saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', initial);
    setThemeState(initial);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('pts_theme', t);
  };
  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return <ThemeCtx.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

/**
 * Runs before React hydrates:
 * - theme (avoids light/dark flash)
 * - sidebar collapsed (avoids wide→narrow jump on reload)
 */
export const themeInitScript = `
(function(){try{
  var s = localStorage.getItem('pts_theme');
  var t = s || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
  if (localStorage.getItem('pts_sidebar_collapsed') === '1') {
    document.documentElement.setAttribute('data-sidebar', 'collapsed');
  } else {
    document.documentElement.removeAttribute('data-sidebar');
  }
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();
`;
