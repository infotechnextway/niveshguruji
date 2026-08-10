"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { nav, site } from "@/lib/nivesh/site";

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
    <header className="nv-header">
      <div className="nv-wrap nv-header__bar">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="nv-header__brand"
        >
          <span aria-hidden className="nv-header__star">
            {"✦"}
          </span>
          <span className="nv-display nv-brand-text">{site.name}</span>
        </Link>

        <nav className="nv-desktop-nav">
          {nav.slice(1).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nv-nav-link is-active" : "nv-nav-link"}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/login"
            className={pathname === "/login" ? "nv-nav-link is-active" : "nv-nav-link"}
          >
            Login
          </Link>
          <Link href="/register" className="nv-btn nv-btn-gold nv-header__cta">
            Start free
          </Link>
        </nav>

        <button
          className="nv-mobile-toggle"
          type="button"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <nav className="nv-wrap nv-mobile-menu" aria-label="Mobile">
          {nav.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={pathname === item.href ? "nv-mobile-link is-active" : "nv-mobile-link"}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className={pathname === "/login" ? "nv-mobile-link is-active" : "nv-mobile-link"}
          >
            Login
          </Link>
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="nv-btn nv-btn-gold nv-mobile-cta"
          >
            Start free
          </Link>
        </nav>
      )}

      <style>{`
        .nv-header {
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: rgba(11,16,32,0.86);
          border-bottom: 1px solid var(--nv-line);
        }
        .nv-header__bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 64px;
          height: 64px;
        }
        .nv-header__brand {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          text-decoration: none;
          color: var(--nv-ivory);
          flex: 1;
        }
        .nv-header__star {
          color: var(--nv-gold);
          font-size: 18px;
          flex-shrink: 0;
        }
        .nv-desktop-nav {
          display: flex;
          align-items: center;
          gap: 22px;
          flex-shrink: 0;
        }
        .nv-nav-link {
          color: var(--nv-muted);
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          white-space: nowrap;
        }
        .nv-nav-link.is-active { color: var(--nv-gold); }
        .nv-header__cta { padding: 0.55rem 1.1rem; }
        .nv-mobile-toggle {
          display: none;
          background: none;
          border: none;
          color: var(--nv-ivory);
          cursor: pointer;
          padding: 8px;
          margin-right: -8px;
          flex-shrink: 0;
        }
        .nv-mobile-menu {
          display: flex;
          flex-direction: column;
          gap: 0;
          padding-bottom: 20px;
          max-height: min(80vh, 520px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .nv-mobile-link {
          color: var(--nv-ivory);
          text-decoration: none;
          padding: 14px 0;
          border-bottom: 1px solid var(--nv-line);
          font-size: 16px;
        }
        .nv-mobile-link.is-active { color: var(--nv-gold); }
        .nv-mobile-cta {
          margin-top: 16px;
          width: 100%;
        }
        @media (max-width: 820px) {
          .nv-desktop-nav { display: none !important; }
          .nv-mobile-toggle { display: grid !important; place-items: center; }
        }
        @media (min-width: 821px) {
          .nv-header__bar { height: 72px; min-height: 72px; }
        }
      `}</style>
    </header>
  );
}
