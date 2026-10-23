import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CenterCard } from "@/components/centers/center-card";
import { PhotoTone } from "@/components/centers/photo-tone";
import { getFilterOptions, listCenters, listRegionCounts } from "@/lib/centers";
import { getRatings } from "@/lib/reviews";
import { DIVE_TYPE_LABELS, label } from "@/lib/labels";

// Directory data changes rarely: re-render at most every 10 minutes.
export const revalidate = 600;

const field = "h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function Home() {
  const [regions, options, centers] = await Promise.all([
    listRegionCounts(),
    getFilterOptions(),
    listCenters({ tipo: [], federazione: [], lingua: [], servizio: [] }),
  ]);
  const ratings = await getRatings(centers.map((c) => c.id));
  // Featured: best rated first, then the rest alphabetically.
  const featured = [...centers]
    .sort((a, b) => (ratings.get(b.id)?.avg_overall ?? 0) - (ratings.get(a.id)?.avg_overall ?? 0))
    .slice(0, 4);

  return (
    <main>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:pb-20 sm:pt-16">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">Trova il diving giusto, raccontato da chi ci è stato</h1>
          <p className="mt-4 max-w-xl text-base opacity-90 sm:text-lg">Recensioni verificate e contatto diretto, dai laghi al mare.</p>
        </div>
      </section>

      <div className="mx-auto -mt-10 max-w-6xl px-4">
        <form action="/diving" className="grid gap-3 rounded-2xl border bg-background p-3 shadow-lg sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1">
            <label htmlFor="h-regione" className="px-1 text-xs font-semibold">Dove</label>
            <select id="h-regione" name="regione" className={field} defaultValue="">
              <option value="">Tutta Italia</option>
              {options.regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="h-tipo" className="px-1 text-xs font-semibold">Tipo di immersione</label>
            <select id="h-tipo" name="tipo" className={field} defaultValue="">
              <option value="">Tutti</option>
              {options.diveTypes.map((t) => <option key={t} value={t}>{label(DIVE_TYPE_LABELS, t)}</option>)}
            </select>
          </div>
          <button type="submit" className={buttonVariants({ className: "h-11 rounded-xl px-6" })}>Cerca diving</button>
        </form>
      </div>

      <section aria-labelledby="dove" className="mx-auto max-w-6xl px-4 pt-12">
        <h2 id="dove" className="text-2xl font-semibold">Dove immergersi</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {regions.slice(0, 8).map((r) => (
            <li key={r.slug}>
              <Link href={`/diving/${r.slug}`} className="block overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <PhotoTone seed={r.slug} className="flex h-24 flex-col justify-end p-3 text-foreground sm:h-28">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-xs text-foreground/70">{r.count === 1 ? "1 diving" : `${r.count} diving`}</span>
                </PhotoTone>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="evidenza" className="mt-12 bg-sand">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="evidenza" className="text-2xl font-semibold">Diving in evidenza</h2>
            <Link href="/diving" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Vedi tutti i diving</Link>
          </div>
          {featured.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((c) => <CenterCard key={c.id} center={c} rating={ratings.get(c.id)} />)}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Nessun diving ancora in elenco.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="titolari" className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 id="titolari" className="text-xl font-semibold">Gestisci un diving?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Rivendica la scheda gratis: ricevi contatti e raccogli recensioni verificate.</p>
          </div>
          <Link href="/diving" className={buttonVariants({ variant: "outline", className: "mt-4 h-11 rounded-xl sm:mt-0" })}>Cerca il tuo diving</Link>
        </div>
      </section>
    </main>
  );
}
