import Link from "next/link";
import { CenterCard } from "@/components/centers/center-card";
import { Filters } from "@/components/centers/filters";
import { MobileFilters } from "@/components/centers/mobile-filters";
import { MapPanel } from "@/components/centers/map-panel";
import { getFilterOptions, listCenters, type CenterFilters } from "@/lib/centers";
import { getRatings } from "@/lib/reviews";

type Props = { title: string; intro: string; filters: CenterFilters; showRegion?: boolean; resetHref: string };

// Shared list + filters + map layout for /diving and /diving/[regione].
export async function Directory({ title, intro, filters, showRegion = true, resetHref }: Props) {
  const [centers, options] = await Promise.all([listCenters(filters), getFilterOptions()]);
  const ratings = await getRatings(centers.map((c) => c.id));
  const activeCount = (showRegion && filters.regione ? 1 : 0) + filters.tipo.length +
    filters.federazione.length + filters.lingua.length + filters.servizio.length;
  const mapCenters = centers.map(({ id, slug, name, region, city, lat, lng }) => ({ id, slug, name, region, city, lat, lng }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{intro}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label="Filtri">
          <Filters options={options} showRegion={showRegion} />
        </aside>

        <section aria-label="Risultati" className="space-y-3">
          <div className="lg:hidden">
            <MobileFilters options={options} showRegion={showRegion} activeCount={activeCount} />
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
