import type { MetadataRoute } from "next";
import { centerPath, isTestCenter, listCenters, regionSlug } from "@/lib/centers";
import { DIVE_TYPE_SEO, siteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const centers = (await listCenters({ attivita: [], tipo: [], federazione: [], lingua: [], servizio: [] })).filter((c) => !isTestCenter(c));

  const regions = new Set(centers.map((c) => regionSlug(c.region)));
  // Only dive type pages that actually list something (empty pages hurt SEO).
  const typePages = new Set<string>();
  for (const c of centers) {
    for (const t of c.dive_types) {
      if (!DIVE_TYPE_SEO[t]) continue;
      typePages.add(`/immersioni/${t}`);
      typePages.add(`/immersioni/${t}/${regionSlug(c.region)}`);
    }
  }

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/diving`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/per-i-diving`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/aggiungi-attivita`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/eudi`, changeFrequency: "monthly", priority: 0.5 },
    ...[...regions].map((r) => ({ url: `${base}/diving/${r}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...[...typePages].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...centers.map((c) => ({ url: `${base}${centerPath(c)}`, lastModified: c.verified_at ?? undefined, changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: `${base}/rimuovi-scheda`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/come-verifichiamo-le-recensioni`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/termini`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
