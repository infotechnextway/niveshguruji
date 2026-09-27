import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="ng-eyebrow">{children}</span>;
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  center,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: string;
  center?: boolean;
}) {
  return (
    <div style={{ maxWidth: center ? 720 : 640, margin: center ? "0 auto" : undefined, textAlign: center ? "center" : "left" }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 style={{ fontSize: "clamp(2rem, 4.5vw, 3.1rem)", marginTop: "1rem" }}>{title}</h2>
      {intro && <p className="ng-muted" style={{ marginTop: "1.1rem", fontSize: "1.1rem", lineHeight: 1.6 }}>{intro}</p>}
    </div>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="ng-mono ng-grad" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 600, lineHeight: 1 }}>
        {value}
      </div>
      <div className="ng-muted" style={{ marginTop: "0.55rem", fontSize: "0.88rem" }}>{label}</div>
    </div>
  );
}
