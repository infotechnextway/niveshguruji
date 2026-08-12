import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { Reveal } from "@/components/funded/Reveal";
import { Eyebrow, SectionHeading } from "@/components/funded/primitives";
import { ContactForm } from "./ContactForm";
import { site, partnerPerks } from "@/lib/funded/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach Nivesh Guruji support, or partner with us as an affiliate.",
};

export default function ContactPage() {
  return (
    <>
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="ng-aura" />
        <div className="ng-wrap ng-contact" style={{ position: "relative", display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 48, padding: "4.5rem 1.5rem", alignItems: "start" }}>
          <div>
            <Reveal>
              <Eyebrow>Contact</Eyebrow>
              <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)", marginTop: "1.2rem" }}>Talk to a real person.</h1>
              <p className="ng-muted" style={{ marginTop: "1.4rem", fontSize: "1.12rem", lineHeight: 1.6, maxWidth: 420 }}>
                Support is based in Indore and answers in hours, not days. Buying, payouts, rules, or partnerships — we're here.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <ul style={{ listStyle: "none", padding: 0, margin: "2.4rem 0 0", display: "grid", gap: 18 }}>
                <Line icon={<Mail size={18} />} label="Email" value={site.email} href={`mailto:${site.email}`} />
                <Line icon={<Phone size={18} />} label="Phone" value={site.phone} href={`tel:${site.phone.replace(/\s/g, "")}`} />
                <Line icon={<MapPin size={18} />} label="Office" value={site.city} />
              </ul>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="ng-card" style={{ padding: "clamp(1.6rem, 4vw, 2.4rem)" }}>
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Partner */}
      <section className="ng-section">
        <div className="ng-wrap">
          <SectionHeading eyebrow="Partner up" title="Earn with every trader you send" intro="Have an audience of Indian traders? Join the affiliate programme and earn on every challenge, paid on the same fast rails." />
          <div className="ng-perks" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: "3rem" }}>
            {partnerPerks.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.07}>
                <div className="ng-card" style={{ padding: "1.8rem", height: "100%" }}>
                  <span aria-hidden style={{ color: "var(--ng-gold)", fontSize: 20 }}>◆</span>
                  <h3 style={{ fontSize: "1.3rem", marginTop: "0.8rem" }}>{p.title}</h3>
                  <p className="ng-muted" style={{ marginTop: "0.7rem", lineHeight: 1.6 }}>{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 860px){ .ng-contact { grid-template-columns: 1fr !important; } }
        @media (max-width: 820px){ .ng-perks { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}

function Line({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const inner = (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: 12, background: "var(--ng-bg-3)", color: "var(--ng-gold)", flexShrink: 0 }}>{icon}</span>
      <span>
        <span className="ng-mono ng-muted" style={{ display: "block", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: "1.05rem" }}>{value}</span>
      </span>
    </div>
  );
  return <li>{href ? <a href={href} style={{ textDecoration: "none", color: "inherit" }}>{inner}</a> : inner}</li>;
}
