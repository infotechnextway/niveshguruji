"use client";

import { useState } from "react";

const topics = ["Buying a challenge", "Payout question", "Rules clarification", "Partner / affiliate", "Something else"];

const field: React.CSSProperties = {
  width: "100%", padding: "0.8rem 1rem", borderRadius: 12,
  border: "1px solid var(--ng-line)", background: "var(--ng-bg)",
  color: "var(--ng-ink)", fontSize: "1rem", fontFamily: "inherit",
};
const label: React.CSSProperties = { display: "block", fontSize: "0.82rem", marginBottom: 8, color: "var(--ng-muted)", fontWeight: 500 };

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", topic: topics[0], message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Tell us your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.message.trim()) e.message = "Add a short message.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSent(true);
    // TODO: POST `form` to your API route / support inbox.
  }

  if (sent) {
    return (
      <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
        <span aria-hidden style={{ color: "var(--ng-gold)", fontSize: 30 }}>◆</span>
        <h2 style={{ fontSize: "1.6rem", marginTop: "0.8rem" }}>Message sent</h2>
        <p className="ng-muted" style={{ marginTop: "0.7rem" }}>Thanks, {form.name.split(" ")[0]} — support replies within a few hours.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <label style={label} htmlFor="c-name">Name</label>
        <input id="c-name" style={field} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" />
        {errors.name && <p style={{ color: "var(--ng-red)", fontSize: "0.82rem", marginTop: 6 }}>{errors.name}</p>}
      </div>
      <div>
        <label style={label} htmlFor="c-email">Email</label>
        <input id="c-email" type="email" style={field} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" />
        {errors.email && <p style={{ color: "var(--ng-red)", fontSize: "0.82rem", marginTop: 6 }}>{errors.email}</p>}
      </div>
      <div>
        <label style={label} htmlFor="c-topic">Topic</label>
        <select id="c-topic" style={field} value={form.topic} onChange={(e) => set("topic", e.target.value)}>
          {topics.map((t) => <option key={t} value={t} style={{ color: "#000" }}>{t}</option>)}
        </select>
      </div>
      <div>
        <label style={label} htmlFor="c-msg">Message</label>
        <textarea id="c-msg" rows={4} style={{ ...field, resize: "vertical" }} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="How can we help?" />
        {errors.message && <p style={{ color: "var(--ng-red)", fontSize: "0.82rem", marginTop: 6 }}>{errors.message}</p>}
      </div>
      <button onClick={submit} type="button" className="ng-btn ng-btn-gold" style={{ justifyContent: "center" }}>Send message →</button>
    </div>
  );
}
