import type { Metadata } from "next";
import { Suspense } from "react";
import { Directory } from "@/components/centers/directory";
import { DirectorySkeleton } from "@/components/centers/directory-skeleton";
import { parseFilters } from "@/lib/centers";

export const metadata: Metadata = {
  title: "Diving in Italia: cerca e confronta",
  description: "Elenco dei diving in Italia, laghi compresi. Filtra per zona, tipo di immersione, federazione, lingue e servizi.",
  // Filtered variants (?tipo=…) point to the unfiltered list, so Google sees one page.
  alternates: { canonical: "/diving" },
};

export default async function DivingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams);
  return (
    <Suspense fallback={<DirectorySkeleton />}>
      <Directory
        title="Diving in Italia"
        intro="Cerca per zona, tipo di immersione, federazione, lingue e servizi."
        filters={filters}
        resetHref="/diving"
        breadcrumbs={[{ name: "DiveAdvisor", path: "/" }, { name: "Diving", path: "/diving" }]}
      />
    </Suspense>
  );
}
