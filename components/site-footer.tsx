import Link from "next/link";
import { DIVE_TYPE_SEO } from "@/lib/site";

// Footer links double as crawl paths to the SEO landing pages.
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t bg-sand">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="font-heading text-lg font-bold">DiveAdvisor</p>
          <p className="mt-2 text-muted-foreground">Trova e contatta i diving in Italia, con recensioni verificate.</p>
        </div>
        <nav aria-label="Immersioni">
          <p className="font-semibold">Immersioni</p>
          <ul className="mt-2 space-y-1">
            {Object.entries(DIVE_TYPE_SEO).map(([slug, s]) => (
              <li key={slug}><Link href={`/immersioni/${slug}`} className="text-muted-foreground hover:text-primary">{s.title}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="DiveAdvisor">
          <p className="font-semibold">DiveAdvisor</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/diving" className="text-muted-foreground hover:text-primary">Tutti i diving</Link></li>
            <li><Link href="/per-i-diving" className="text-muted-foreground hover:text-primary">Per i diving</Link></li>
            <li><Link href="/privacy" className="text-muted-foreground hover:text-primary">Privacy</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
