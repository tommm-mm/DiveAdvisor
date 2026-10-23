import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { siteUrl } from "@/lib/site";

// AB style: Inter for text, Fraunces (serif) for headings.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: { default: "DiveAdvisor — Trova e contatta i diving in Italia", template: "%s | DiveAdvisor" },
  description: "Cerca, confronta e contatta i diving in Italia, laghi compresi. Recensioni verificate.",
  metadataBase: new URL(siteUrl()),
  openGraph: { type: "website", locale: "it_IT", siteName: "DiveAdvisor" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="antialiased">
        <SiteHeader />
        {children}
        <SiteFooter />
        {/* Vercel Web Analytics: cookieless, no personal data; only collects once enabled in the Vercel project. */}
        <Analytics />
      </body>
    </html>
  );
}
