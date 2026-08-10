"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { nav, site } from "@/lib/nivesh/site";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(12px)",
        background: "rgba(11,16,32,0.72)",
        borderBottom: "1px solid var(--nv-line)",
      }}
    >
      <div
        className="nv-wrap"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}
      >
        <Link
          href="/"
          onClick={() => setOpen(false)}
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--nv-ivory)" }}
        >
          <span aria-hidden style={{ color: "var(--nv-gold)", fontSize: 20 }}>
            {"✦"}
          </span>
          <span className="nv-display" style={{ fontSize: 22, fontWeight: 600 }}>
            {site.name}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="nv-desktop-nav" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {nav.slice(1).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  color: active ? "var(--nv-gold)" : "var(--nv-muted)",
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/login"
            style={{
              color: pathname === "/login" ? "var(--nv-gold)" : "var(--nv-muted)",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            Login
          </Link>
          <Link href="/register" className="nv-btn nv-btn-gold" style={{ padding: "0.6rem 1.2rem" }}>
            Start free
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          className="nv-mobile-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          style={{ display: "none", background: "none", border: "none", color: "var(--nv-ivory)", cursor: "pointer" }}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav
          className="nv-wrap"
          style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 20 }}
        >
          {nav.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{
                color: pathname === item.href ? "var(--nv-gold)" : "var(--nv-ivory)",
                textDecoration: "none",
                padding: "12px 0",
                borderBottom: "1px solid var(--nv-line)",
                fontSize: 17,
              }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            style={{
              color: pathname === "/login" ? "var(--nv-gold)" : "var(--nv-ivory)",
              textDecoration: "none",
              padding: "12px 0",
              borderBottom: "1px solid var(--nv-line)",
              fontSize: 17,
            }}
          >
            Login
          </Link>
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="nv-btn nv-btn-gold"
            style={{ marginTop: 16, justifyContent: "center" }}
          >
            Start free
          </Link>
        </nav>
      )}

      <style>{`
        @media (max-width: 820px) {
          .nv-desktop-nav { display: none !important; }
          .nv-mobile-toggle { display: block !important; }
        }
      `}</style>
    </header>
  );
}
