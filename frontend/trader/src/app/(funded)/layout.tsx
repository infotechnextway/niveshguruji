import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/funded/Navbar";
import { Footer } from "@/components/funded/Footer";
import { site } from "@/lib/funded/site";
import "./funded.css";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description:
    "Nivesh Guruji is a funded-trader programme for India. Pass a challenge, trade a simulated funded account up to ₹2 crore, and keep up to 90% of your performance — paid in INR within 24 hours.",
  metadataBase: new URL(`https://${site.domain}`),
  openGraph: { title: site.name, description: site.tagline, type: "website" },
};

export default function FundedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ng-root ${grotesk.variable} ${inter.variable} ${mono.variable}`}>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
