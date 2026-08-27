"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { faqs } from "@/lib/funded/site";

export function FaqList() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 820, margin: "0 auto" }}>
      {faqs.map((f, i) => {
        const active = open === i;
        return (
          <div key={f.q} className="ng-card" style={{ overflow: "hidden" }}>
            <button
              onClick={() => setOpen(active ? null : i)}
              aria-expanded={active}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "1.15rem 1.4rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                color: "var(--ng-ink)",
                fontSize: "1.02rem",
                fontWeight: 600,
              }}
            >
              <span>{f.q}</span>
              <ChevronDown
                size={20}
                style={{
                  flexShrink: 0,
                  color: "var(--ng-gold-dark)",
                  transform: active ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.25s ease",
                }}
              />
            </button>
            <div
              style={{
                maxHeight: active ? 400 : 0,
                overflow: "hidden",
                transition: "max-height 0.3s ease",
              }}
            >
              <p
                className="ng-muted"
                style={{ padding: "0 1.4rem 1.25rem", margin: 0, lineHeight: 1.65, fontSize: "0.95rem" }}
              >
                {f.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
