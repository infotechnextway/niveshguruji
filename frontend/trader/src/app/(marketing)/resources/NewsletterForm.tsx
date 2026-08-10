"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function submit() {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) {
      setError("Enter a valid email so we can reach you.");
      return;
    }
    setError("");
    setDone(true);
    // TODO: POST `email` to your list provider (Mailchimp, Resend, etc.)
  }

  if (done) {
    return (
      <p className="nv-display" style={{ fontSize: "clamp(1.1rem, 4vw, 1.3rem)", color: "var(--nv-ink)" }}>
        You’re in {"✦"} Look for the first note this Sunday.
      </p>
    );
  }

  return (
    <div>
      <div className="nv-newsletter-row" style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="you@email.com"
          aria-label="Email address"
          style={{
            flex: "1 1 220px",
            minWidth: 0,
            width: "100%",
            maxWidth: "100%",
            padding: "0.85rem 1.1rem",
            borderRadius: 999,
            border: "1px solid var(--nv-line-2)",
            background: "#fff",
            color: "var(--nv-ink)",
            fontSize: "16px",
          }}
        />
        <button onClick={submit} className="nv-btn nv-btn-gold" type="button">
          Subscribe
        </button>
      </div>
      {error && (
        <p style={{ marginTop: 12, color: "#c0392b", fontSize: "0.9rem" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
