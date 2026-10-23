import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Directory } from "@/components/centers/directory";
import { DirectorySkeleton } from "@/components/centers/directory-skeleton";
import { listCenters, parseFilters, regionSlug } from "@/lib/centers";
import { DIVE_TYPE_SEO } from "@/lib/site";

type Props = {
  params: Promise<{ tipo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// SEO landing pages per dive type, e.g. /immersioni/tecnico ("Diving tecnico in Italia").
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const seo = DIVE_TYPE_SEO[(await params).tipo];
  if (!seo) return {};
  const { tipo } = await params;
  return { title: `${seo.title} in Italia`, description: `${seo.intro} Elenco e contatti in tutta Italia.`, alternates: { canonical: `/immersioni/${tipo}` } };
}

export default async function DiveTypePage({ params, searchParams }: Props) {
  const { tipo } = await params;
  const seo = DIVE_TYPE_SEO[tipo];
  if (!seo) notFound();
  const filters = { ...parseFilters(await searchParams), tipo: [tipo] };
  // Link only regions that have this dive type, so we never link to empty pages.
  const withType = await listCenters({ tipo: [tipo], federazione: [], lingua: [], servizio: [] });
  const regions = [...new Set(withType.map((c) => c.region))].sort((a, b) => a.localeCompare(b, "it"))
    .map((name) => ({ name, slug: regionSlug(name) }));
  return (
    <>
      <Suspense fallback={<DirectorySkeleton />}>
        <Directory
          title={`${seo.title} in Italia`}
          intro={seo.intro}
          filters={filters}
          showType={false}
          resetHref={`/immersioni/${tipo}`}
          breadcrumbs={[{ name: "DiveAdvisor", path: "/" }, { name: seo.title, path: `/immersioni/${tipo}` }]}
        />
      </Suspense>
      {regions.length > 0 && <nav aria-label="Per regione" className="mx-auto max-w-6xl px-4 pb-10">
        <h2 className="text-lg font-semibold">{seo.title} per regione</h2>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {regions.map((r) => (
            <li key={r.slug}><Link href={`/immersioni/${tipo}/${r.slug}`} className="text-primary underline-offset-4 hover:underline">{r.name}</Link></li>
          ))}
        </ul>
      </nav>}
    </>
  );
}
