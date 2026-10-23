// Canonical site URL for metadata, sitemap and structured data.
// NEXT_PUBLIC_SITE_URL wins (own domain); on Vercel fall back to the production domain.
export function siteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export const isProduction = () => process.env.VERCEL_ENV === "production";

// SEO wording per dive type, used by /immersioni pages ("Diving tecnico in Piemonte").
export const DIVE_TYPE_SEO: Record<string, { title: string; intro: string }> = {
  lago: { title: "Immersioni in lago", intro: "Diving per immersioni nei laghi: visibilità, temperature e fondali d'acqua dolce." },
  mare: { title: "Immersioni in mare", intro: "Diving per immersioni in mare: secche, relitti, pareti e uscite in barca." },
  tecnico: { title: "Diving tecnico", intro: "Diving per immersioni tecniche: miscele, decompressione e corsi tecnici." },
  corsi: { title: "Corsi sub", intro: "Diving che organizzano corsi, dal primo brevetto alle specialità." },
};
