import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

// AB style: Inter for text, Fraunces (serif) for headings.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: { default: "DiveAdvisor — Trova e contatta i diving in Italia", template: "%s | DiveAdvisor" },
  description: "Cerca, confronta e contatta i diving in Italia, laghi compresi. Recensioni verificate.",
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
      </body>
    </html>
  );
}
