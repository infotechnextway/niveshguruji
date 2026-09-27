import Link from "next/link";
import type { Metadata } from "next";
import { Reveal } from "@/components/funded/Reveal";
import { Eyebrow, SectionHeading, Stat } from "@/components/funded/primitives";
import { PayoutMarquee } from "@/components/funded/PayoutMarquee";
import { payouts, heroStats } from "@/lib/funded/site";
import { inr } from "@/lib/funded/format";

export const metadata: Metadata = {
  title: "Payouts",
  description: "See real INR payouts, average payout time, and how withdrawals work at Nivesh Guruji.",
};

export default function PayoutsPage() {
  return (
    <>
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="ng-aura" />
        <div className="ng-wrap" style={{ position: "relative", padding: "4.5rem 1.5rem 2rem", maxWidth: 820 }}>
          <Reveal>
            <Eyebrow>Payouts</Eyebrow>
            <h1 style={{ fontSize: "clamp(2.4rem, 5.5vw, 4rem)", marginTop: "1.2rem" }}>
              We pay fast, and we pay in <span className="ng-grad">rupees.</span>
            </h1>
            <p className="ng-muted" style={{ marginTop: "1.4rem", fontSize: "1.15rem", lineHeight: 1.6 }}>
              Approved withdrawals land in your Indian bank or UPI within 24 hours. Here's the proof, updated from the server.
            </p>
          </Reveal>
        </div>
      </section>

      <section style={{ borderTop: "1px solid var(--ng-line)", borderBottom: "1px solid var(--ng-line)" }}>
        <div className="ng-wrap ng-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 32, padding: "3rem 1.5rem" }}>
          {heroStats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}><Stat {...s} /></Reveal>
          ))}
        </div>
      </section>

      <section className="ng-section" style={{ paddingBottom: "3rem" }}>
        <div className="ng-wrap" style={{ marginBottom: "2rem" }}>
          <SectionHeading eyebrow="Straight from the server" title="Recent payouts" />
        </div>
        <PayoutMarquee />
      </section>

      {/* Payout table */}
      <section className="ng-section" style={{ paddingTop: 0 }}>
        <div className="ng-wrap">
          <div className="ng-table-wrap" style={{ overflowX: "auto" }}>
            <table className="ng-mono" style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-muted)", fontWeight: 500 }}>Trader</th>
                  <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-muted)", fontWeight: 500 }}>City</th>
                  <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-muted)", fontWeight: 500 }}>Processed</th>
                  <th style={{ textAlign: "right", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-gold)" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p, i) => (
                  <tr key={i}>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ng-line)" }}>{p.name}</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-muted)" }}>{p.city}</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-muted)" }}>{p.hrs}</td>
                    <td style={{ textAlign: "right", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)" }} className="ng-up">{inr(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ng-muted" style={{ marginTop: 16, fontSize: "0.8rem" }}>
            Figures illustrate the programme and reflect simulated-account performance. Payouts are subject to the programme terms.
          </p>
        </div>
      </section>

      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="ng-aura" />
        <div className="ng-wrap" style={{ position: "relative", padding: "5rem 1.5rem", textAlign: "center" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)", maxWidth: 680, margin: "0 auto" }}>Your first payout could be days away.</h2>
            <div style={{ marginTop: "2.2rem" }}>
              <Link href="/challenges" className="ng-btn ng-btn-gold">Get funded →</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px){ .ng-stats { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 560px){ .ng-stats { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}
