import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Directory } from "@/components/centers/directory";
import { DirectorySkeleton } from "@/components/centers/directory-skeleton";
import { parseFilters, regionFromSlug } from "@/lib/centers";
import { DIVE_TYPE_SEO } from "@/lib/site";

type Props = {
  params: Promise<{ tipo: string; regione: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// e.g. /immersioni/tecnico/piemonte -> "Diving tecnico in Piemonte", the long-tail search we target.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tipo, regione } = await params;
  const seo = DIVE_TYPE_SEO[tipo];
  const region = await regionFromSlug(regione);
  if (!seo || !region) return {};
  return {
    title: `${seo.title} in ${region.name}`,
    description: `${seo.intro} I diving in ${region.name} con recensioni e contatti diretti.`,
    alternates: { canonical: `/immersioni/${tipo}/${regione}` },
  };
}

export default async function DiveTypeRegionPage({ params, searchParams }: Props) {
  const { tipo, regione } = await params;
  const seo = DIVE_TYPE_SEO[tipo];
  const region = await regionFromSlug(regione);
  if (!seo || !region) notFound();
  const filters = { ...parseFilters(await searchParams), tipo: [tipo], regione };
  return (
    <Suspense fallback={<DirectorySkeleton />}>
      <Directory
        title={`${seo.title} in ${region.name}`}
        intro={seo.intro}
        filters={filters}
        showRegion={false}
        showType={false}
        resetHref={`/immersioni/${tipo}/${regione}`}
        breadcrumbs={[
          { name: "DiveAdvisor", path: "/" },
          { name: seo.title, path: `/immersioni/${tipo}` },
          { name: region.name, path: `/immersioni/${tipo}/${regione}` },
        ]}
      />
    </Suspense>
  );
}
