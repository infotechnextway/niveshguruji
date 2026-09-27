import Link from "next/link";
import type { Metadata } from "next";
import { Reveal } from "@/components/funded/Reveal";
import { Eyebrow, SectionHeading } from "@/components/funded/primitives";
import { ChallengeSelector } from "@/components/funded/ChallengeSelector";
import { accountSizes, models } from "@/lib/funded/site";
import { inr, discounted } from "@/lib/funded/format";

export const metadata: Metadata = {
  title: "Challenges",
  description: "Instant, 1-Step and 2-Step funded-trader challenges from ₹5 lakh to ₹1 crore, priced in INR.",
};

export default function ChallengesPage() {
  return (
    <>
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="ng-aura" />
        <div className="ng-wrap" style={{ position: "relative", padding: "4.5rem 1.5rem 2rem", maxWidth: 820 }}>
          <Reveal>
            <Eyebrow>Challenges</Eyebrow>
            <h1 style={{ fontSize: "clamp(2.4rem, 5.5vw, 4rem)", marginTop: "1.2rem" }}>
              One fee. One target. <span className="ng-grad">A funded account.</span>
            </h1>
            <p className="ng-muted" style={{ marginTop: "1.4rem", fontSize: "1.15rem", lineHeight: 1.6 }}>
              Choose the route that suits how you trade. Prices are in INR and already include our new-trader discount when you use the code.
            </p>
          </Reveal>
        </div>
      </section>

      <section style={{ paddingTop: "1.5rem" }}>
        <div className="ng-wrap">
          <ChallengeSelector />
        </div>
      </section>

      {/* Full price matrix */}
      <section className="ng-section">
        <div className="ng-wrap">
          <SectionHeading eyebrow="Full price list" title="Every size, every route" intro="Discounted prices shown; original in grey. All amounts in INR." />
          <div className="ng-table-wrap" style={{ marginTop: "2.5rem", overflowX: "auto" }}>
            <table className="ng-mono" style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-muted)", fontWeight: 500 }}>Account</th>
                  {models.map((m) => (
                    <th key={m.id} style={{ textAlign: "right", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-gold-dark)" }}>
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accountSizes.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ng-line)" }}>{s.full}</td>
                    {models.map((m) => (
                      <td key={m.id} style={{ textAlign: "right", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)" }}>
                        <span className="ng-grad" style={{ fontWeight: 600 }}>{inr(discounted(s.prices[m.id]))}</span>
                        <span className="ng-muted" style={{ textDecoration: "line-through", marginLeft: 8, fontSize: "0.82em" }}>{inr(s.prices[m.id])}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section style={{ textAlign: "center", paddingBottom: "5rem" }}>
        <div className="ng-wrap">
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", maxWidth: 620, margin: "0 auto" }}>Questions before you start?</h2>
          <div style={{ marginTop: "1.8rem", display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/how-it-works" className="ng-btn ng-btn-ghost">Read the rules</Link>
            <Link href="/contact" className="ng-btn ng-btn-gold">Talk to support</Link>
          </div>
        </div>
      </section>
    </>
  );
}
