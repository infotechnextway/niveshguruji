import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { Reveal } from "@/components/nivesh/Reveal";
import { Eyebrow } from "@/components/nivesh/primitives";
import { ContactForm } from "./ContactForm";
import { site } from "@/lib/nivesh/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Book a free check-in or ask us anything. We reply to every message.",
};

export default function ContactPage() {
  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      <div className="nv-stars" />
      <div
        className="nv-wrap nv-contact-grid"
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "0.9fr 1.1fr",
          gap: 48,
          padding: "5rem 1.5rem",
          alignItems: "start",
        }}
      >
        {/* Left: intro + details */}
        <div>
          <Reveal>
            <Eyebrow>Contact</Eyebrow>
            <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)", marginTop: "1.2rem" }}>
              Say hello. We read every word.
            </h1>
            <p className="nv-muted" style={{ marginTop: "1.4rem", fontSize: "1.12rem", lineHeight: 1.6, maxWidth: 420 }}>
              Whether you want to book a free check-in or just ask whether this is right for you,
              there’s a real person on the other end.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <ul style={{ listStyle: "none", padding: 0, margin: "2.5rem 0 0", display: "grid", gap: 20 }}>
              <ContactLine icon={<Mail size={18} />} label="Email" value={site.email} href={`mailto:${site.email}`} />
              <ContactLine icon={<Phone size={18} />} label="Phone" value={site.phone} href={`tel:${site.phone.replace(/\s/g, "")}`} />
              <ContactLine icon={<MapPin size={18} />} label="Office" value={site.city} />
            </ul>
          </Reveal>
        </div>

        {/* Right: form */}
        <Reveal delay={0.15}>
          <div className="nv-card" style={{ padding: "clamp(1.6rem, 4vw, 2.6rem)" }}>
            <ContactForm />
          </div>
        </Reveal>
      </div>

      <style>{`
        @media (max-width: 860px) { .nv-contact-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function ContactLine({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 42,
          height: 42,
          borderRadius: 12,
          background: "var(--nv-ink-3)",
          color: "var(--nv-gold)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span>
        <span className="nv-mono nv-muted" style={{ display: "block", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {label}
        </span>
        <span style={{ fontSize: "1.05rem" }}>{value}</span>
      </span>
    </div>
  );
  return <li>{href ? <a href={href} style={{ textDecoration: "none", color: "inherit" }}>{inner}</a> : inner}</li>;
}
