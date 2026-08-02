'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';
import {
  BOTTOM_NAV_TABS,
  MORE_MENU_ITEMS,
  isMoreNavActive,
  isNavActive,
} from '@/lib/nav';
import { clearSession } from '@/lib/auth';

/** Mobile-only fixed bottom tab bar (≤768px). Uses client-side routing via Next Link. */
export function BottomNav() {
  const path = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = isMoreNavActive(path, moreOpen);

  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  function signOut() {
    clearSession();
    setMoreOpen(false);
    router.push('/login');
  }

  function handleMoreToggle() {
    setMoreOpen((open) => !open);
  }

  return (
    <>
      {moreOpen && (
        <div className="bottom-nav-more" role="presentation">
          <button
            type="button"
            className="bottom-nav-more__backdrop"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="bottom-nav-more__panel"
            role="menu"
            aria-label="More"
          >
            {MORE_MENU_ITEMS.map((item) =>
              item.kind === 'link' ? (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className={`bottom-nav-more__item${isNavActive(path, item.href) ? ' active' : ''}`}
                  onClick={() => setMoreOpen(false)}
                >
                  <span className="bottom-nav-more__icon" aria-hidden>
                    {item.icon(20)}
                  </span>
                  <span className="bottom-nav-more__label">{item.label}</span>
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className="bottom-nav-more__item bottom-nav-more__item--signout"
                  onClick={signOut}
                >
                  <span className="bottom-nav-more__icon" aria-hidden>
                    {item.icon(20)}
                  </span>
                  <span className="bottom-nav-more__label">{item.label}</span>
                </button>
              ),
            )}
          </div>
        </div>
      )}

      <nav className="bottom-nav" aria-label="Primary">
        {BOTTOM_NAV_TABS.map((item) => {
          const active = isNavActive(path, item.href);
          const renderIcon = active && item.iconFilled ? item.iconFilled : item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav__item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              onClick={() => setMoreOpen(false)}
            >
              <span className="bottom-nav__icon" aria-hidden>
                {renderIcon(22)}
              </span>
              <span className="bottom-nav__label">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          className={`bottom-nav__item${moreActive ? ' active' : ''}`}
          aria-label="More"
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          onClick={handleMoreToggle}
        >
          <span className="bottom-nav__icon" aria-hidden>
            {moreActive ? <Icon.MenuFilled size={22} /> : <Icon.Menu size={22} />}
          </span>
          <span className="bottom-nav__label">More</span>
        </button>
      </nav>
    </>
  );
}
