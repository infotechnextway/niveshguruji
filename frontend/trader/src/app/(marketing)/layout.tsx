import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/nivesh/Navbar";
import { Footer } from "@/components/nivesh/Footer";
import { site } from "@/lib/nivesh/site";
import "./nivesh.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description:
    "Nivesh Guruji makes investing simple for everyday India — plain-language lessons, a personal roadmap, and a guide with no products to sell.",
  metadataBase: new URL(`https://${site.domain}`),
  openGraph: { title: site.name, description: site.tagline, type: "website" },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`nv-root ${fraunces.variable} ${inter.variable} ${mono.variable}`}>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
