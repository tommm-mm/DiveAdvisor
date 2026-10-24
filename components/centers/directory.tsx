import Link from "next/link";
import { CenterCard } from "@/components/centers/center-card";
import { Filters } from "@/components/centers/filters";
import { MobileFilters } from "@/components/centers/mobile-filters";
import { MapPanel } from "@/components/centers/map-panel";
import { getFilterOptions, listCenters, type CenterFilters } from "@/lib/centers";
import { getRatings } from "@/lib/reviews";
import { JsonLd, breadcrumbLd, type Crumb } from "@/components/json-ld";
import { centerPath } from "@/lib/centers";
import { siteUrl } from "@/lib/site";

type Props = {
  title: string; intro: string; filters: CenterFilters; resetHref: string;
  showRegion?: boolean; showType?: boolean;
  breadcrumbs?: Crumb[]; // for schema.org BreadcrumbList
};

// Shared list + filters + map layout for /diving, /diving/[regione] and /immersioni pages.
export async function Directory({ title, intro, filters, resetHref, showRegion = true, showType = true, breadcrumbs }: Props) {
  const [centers, options] = await Promise.all([listCenters(filters), getFilterOptions()]);
  const ratings = await getRatings(centers.map((c) => c.id));
  const activeCount = (filters.q ? 1 : 0) + filters.attivita.length + (showRegion && filters.regione ? 1 : 0) + (showType ? filters.tipo.length : 0) +
    filters.federazione.length + filters.lingua.length + filters.servizio.length;
  const mapCenters = centers.map(({ id, slug, name, region, city, lat, lng }) => ({ id, slug, name, region, city, lat, lng }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <JsonLd data={[
        ...(breadcrumbs ? [breadcrumbLd(breadcrumbs)] : []),
        {
          "@context": "https://schema.org", "@type": "ItemList", name: title,
          itemListElement: centers.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, url: `${siteUrl()}${centerPath(c)}` })),
        },
      ]} />
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{intro}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label="Filtri">
          <Filters options={options} showRegion={showRegion} showType={showType} />
        </aside>

        <section aria-label="Risultati" className="space-y-3">
          <div className="lg:hidden">
            <MobileFilters options={options} showRegion={showRegion} showType={showType} activeCount={activeCount} />
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {centers.length === 1 ? "1 diving trovato" : `${centers.length} diving trovati`}
          </p>
          {centers.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="font-medium">Nessun diving corrisponde ai filtri</p>
              <p className="mt-1 text-sm text-muted-foreground">Prova a togliere qualche filtro.</p>
              <Link href={resetHref} className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">
                Azzera filtri
              </Link>
            </div>
          ) : (
            centers.map((c) => <CenterCard key={c.id} center={c} rating={ratings.get(c.id)} />)
          )}
        </section>

        <section aria-label="Mappa" className="order-first lg:order-none lg:sticky lg:top-4 lg:self-start">
          <MapPanel centers={mapCenters} />
        </section>
      </div>
    </main>
  );
}
