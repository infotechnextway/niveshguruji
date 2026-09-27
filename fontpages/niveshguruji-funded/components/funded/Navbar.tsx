"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { nav, site } from "@/lib/funded/site";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Announcement */}
      <div style={{ background: "linear-gradient(90deg, var(--ng-gold), var(--ng-gold-soft))", color: "#241a02", textAlign: "center", fontSize: "0.85rem", fontWeight: 600, padding: "0.5rem 1rem" }}>
        New trader offer — {site.discountPct}% off with code{" "}
        <span className="ng-mono" style={{ fontWeight: 700 }}>{site.discountCode}</span>
      </div>

      <header style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)", background: "rgba(7,10,22,0.8)", borderBottom: "1px solid var(--ng-line)" }}>
        <div className="ng-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 70 }}>
          <Link href="/" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ng-ivory)" }}>
            <span aria-hidden style={{ color: "var(--ng-gold)", fontSize: 22 }}>◆</span>
            <span className="ng-display" style={{ fontSize: 20, fontWeight: 700 }}>{site.name}</span>
          </Link>

          <nav className="ng-desktop-nav" style={{ display: "flex", alignItems: "center", gap: 26 }}>
            {nav.slice(1).map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} style={{ color: active ? "var(--ng-gold)" : "var(--ng-muted)", textDecoration: "none", fontSize: 15, fontWeight: 500 }}>
                  {item.label}
                </Link>
              );
            })}
            <Link href="/challenges" className="ng-btn ng-btn-gold" style={{ padding: "0.6rem 1.2rem" }}>Get funded</Link>
          </nav>

          <button className="ng-mobile-toggle" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)} style={{ display: "none", background: "none", border: "none", color: "var(--ng-ivory)", cursor: "pointer" }}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {open && (
          <nav className="ng-wrap" style={{ display: "flex", flexDirection: "column", paddingBottom: 18 }}>
            {nav.slice(1).map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} style={{ color: pathname === item.href ? "var(--ng-gold)" : "var(--ng-ivory)", textDecoration: "none", padding: "12px 0", borderBottom: "1px solid var(--ng-line)", fontSize: 17 }}>
                {item.label}
              </Link>
            ))}
            <Link href="/challenges" onClick={() => setOpen(false)} className="ng-btn ng-btn-gold" style={{ marginTop: 16, justifyContent: "center" }}>Get funded</Link>
          </nav>
        )}

        <style>{`
          @media (max-width: 820px) {
            .ng-desktop-nav { display: none !important; }
            .ng-mobile-toggle { display: block !important; }
          }
        `}</style>
      </header>
    </>
  );
}
