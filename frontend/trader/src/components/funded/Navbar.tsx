"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLockup } from "@/components/BrandLogo";
import { nav, site } from "@/lib/funded/site";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div className="ng-announce">
        New trader offer — {site.discountPct}% off with code{" "}
        <span className="ng-mono" style={{ fontWeight: 700 }}>{site.discountCode}</span>
      </div>

      <header className="ng-header">
        <div className="ng-wrap ng-header__bar">
          <Link href="/" onClick={() => setOpen(false)} className="ng-header__brand" aria-label={site.name}>
            <BrandLockup height={40} className="ng-header__logo" />
          </Link>

          <nav className="ng-desktop-nav">
            {nav.slice(1).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "ng-nav-link is-active" : "ng-nav-link"}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/login"
              className={pathname === "/login" ? "ng-nav-link is-active" : "ng-nav-link"}
            >
              Login
            </Link>
            <Link href="/register" className="ng-btn ng-btn-gold" style={{ padding: "0.6rem 1.2rem" }}>
              Get funded
            </Link>
          </nav>

          <button
            className="ng-mobile-toggle"
            type="button"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {open && (
          <nav className="ng-wrap ng-mobile-menu" aria-label="Mobile">
            {nav.slice(1).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={pathname === item.href ? "ng-mobile-link is-active" : "ng-mobile-link"}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={pathname === "/login" ? "ng-mobile-link is-active" : "ng-mobile-link"}
            >
              Login
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="ng-btn ng-btn-gold"
              style={{ marginTop: 16, justifyContent: "center", width: "100%" }}
            >
              Get funded
            </Link>
          </nav>
        )}

        <style>{`
          .ng-announce {
            background: linear-gradient(90deg, var(--ng-gold), var(--ng-gold-soft));
            color: #241a02;
            text-align: center;
            font-size: 0.85rem;
            font-weight: 600;
            padding: 0.5rem 1rem;
          }
          .ng-header {
            position: sticky;
            top: 0;
            z-index: 50;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            background: rgba(7,10,22,0.86);
            border-bottom: 1px solid var(--ng-line);
          }
          .ng-header__bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-height: 64px;
            height: 64px;
          }
          .ng-header__brand {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            text-decoration: none;
            color: var(--ng-ivory);
            flex: 1;
          }
          .ng-header__logo {
            height: 40px;
            width: auto;
            max-width: min(58vw, 220px);
            object-fit: contain;
            border-radius: 8px;
          }
          .ng-desktop-nav {
            display: flex;
            align-items: center;
            gap: 22px;
            flex-shrink: 0;
          }
          .ng-nav-link {
            color: var(--ng-muted);
            text-decoration: none;
            font-size: 15px;
            font-weight: 500;
            white-space: nowrap;
          }
          .ng-nav-link.is-active { color: var(--ng-gold); }
          .ng-mobile-toggle {
            display: none;
            background: none;
            border: none;
            color: var(--ng-ivory);
            cursor: pointer;
            padding: 8px;
            margin-right: -8px;
            flex-shrink: 0;
          }
          .ng-mobile-menu {
            display: flex;
            flex-direction: column;
            padding-bottom: 18px;
            max-height: min(80vh, 520px);
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          .ng-mobile-link {
            color: var(--ng-ivory);
            text-decoration: none;
            padding: 12px 0;
            border-bottom: 1px solid var(--ng-line);
            font-size: 16px;
          }
          .ng-mobile-link.is-active { color: var(--ng-gold); }
          @media (max-width: 820px) {
            .ng-desktop-nav { display: none !important; }
            .ng-mobile-toggle { display: grid !important; place-items: center; }
          }
          @media (min-width: 821px) {
            .ng-header__bar { height: 70px; min-height: 70px; }
          }
        `}</style>
      </header>
    </>
  );
}
