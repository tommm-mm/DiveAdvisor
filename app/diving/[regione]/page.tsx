import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Directory } from "@/components/centers/directory";
import { DirectorySkeleton } from "@/components/centers/directory-skeleton";
import { parseFilters, regionFromSlug } from "@/lib/centers";

type Props = {
  params: Promise<{ regione: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const region = await regionFromSlug((await params).regione);
  if (!region) return {};
  return {
    title: `Diving in ${region.name}`,
    description: `I diving in ${region.name}: tipi di immersione, federazioni, servizi e contatti.`,
    alternates: { canonical: `/diving/${region.slug}` },
  };
}

export default async function RegionPage({ params, searchParams }: Props) {
  const { regione } = await params;
  const region = await regionFromSlug(regione);
  if (!region) notFound();
  const filters = { ...parseFilters(await searchParams), regione };
  return (
    <Suspense fallback={<DirectorySkeleton />}>
      <Directory
        title={`Diving in ${region.name}`}
        intro="Filtra per tipo di immersione, federazione, lingue e servizi."
        filters={filters}
        showRegion={false}
        resetHref={`/diving/${regione}`}
        breadcrumbs={[{ name: "DiveAdvisor", path: "/" }, { name: "Diving", path: "/diving" }, { name: region.name, path: `/diving/${regione}` }]}
      />
    </Suspense>
  );
}
