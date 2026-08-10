"use client";

import { useState } from "react";

const topics = ["Book a free check-in", "Question about plans", "Portfolio review", "Something else"];

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.8rem 1rem",
  borderRadius: 12,
  border: "1px solid var(--nv-line)",
  background: "var(--nv-ink)",
  color: "var(--nv-ivory)",
  fontSize: "1rem",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.82rem",
  marginBottom: 8,
  color: "var(--nv-muted)",
  fontWeight: 500,
};

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", topic: topics[0], message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Tell us what to call you.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "We need a valid email to reply.";
    if (!form.message.trim()) e.message = "Add a line about what you need.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSent(true);
    // TODO: POST `form` to your API route / email service.
  }

  if (sent) {
    return (
      <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
        <span aria-hidden style={{ color: "var(--nv-gold)", fontSize: 34 }}>{"✦"}</span>
        <h2 style={{ fontSize: "1.7rem", marginTop: "0.8rem" }}>Message received</h2>
        <p className="nv-muted" style={{ marginTop: "0.8rem" }}>
          Thanks, {form.name.split(" ")[0]}. We reply within one working day.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <label style={labelStyle} htmlFor="nv-name">Your name</label>
        <input id="nv-name" style={fieldStyle} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Priya Sharma" />
        {errors.name && <p style={{ color: "#e8a0a0", fontSize: "0.82rem", marginTop: 6 }}>{errors.name}</p>}
      </div>

      <div>
        <label style={labelStyle} htmlFor="nv-email">Email</label>
        <input id="nv-email" type="email" style={fieldStyle} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" />
        {errors.email && <p style={{ color: "#e8a0a0", fontSize: "0.82rem", marginTop: 6 }}>{errors.email}</p>}
      </div>

      <div>
        <label style={labelStyle} htmlFor="nv-topic">What’s this about?</label>
        <select id="nv-topic" style={fieldStyle} value={form.topic} onChange={(e) => set("topic", e.target.value)}>
          {topics.map((t) => (
            <option key={t} value={t} style={{ color: "#000" }}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle} htmlFor="nv-msg">Message</label>
        <textarea
          id="nv-msg"
          rows={4}
          style={{ ...fieldStyle, resize: "vertical" }}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="I’ve never invested and want to start with a small SIP\u2026"
        />
        {errors.message && <p style={{ color: "#e8a0a0", fontSize: "0.82rem", marginTop: 6 }}>{errors.message}</p>}
      </div>

      <button onClick={submit} className="nv-btn nv-btn-gold" type="button" style={{ justifyContent: "center" }}>
        Send message {"→"}
      </button>
    </div>
  );
}
