import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { CenterBadges } from "@/components/centers/center-badges";
import { MapPanel } from "@/components/centers/map-panel";
import { centerPath, getCenter, regionSlug, type Center } from "@/lib/centers";
import { LANGUAGE_LABELS, SERVICE_LABELS, label } from "@/lib/labels";

type Props = { params: Promise<{ regione: string; slug: string }> };

// Directory data changes rarely: re-render at most every 10 minutes.
export const revalidate = 600;

const location = (c: Center) => [c.city, c.province && `(${c.province})`].filter(Boolean).join(" ");
const whatsappUrl = (n: string) => `https://wa.me/${n.replace(/[^\d]/g, "")}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { regione, slug } = await params;
  const c = await getCenter(regione, slug);
  if (!c) return {};
  return {
    title: `${c.name} – diving a ${c.city ?? c.region}`,
    description: c.description ?? `${c.name}, diving a ${location(c)}, ${c.region}. Servizi, lingue e contatti.`,
    alternates: { canonical: centerPath(c) },
  };
}

export default async function CenterPage({ params }: Props) {
  const { regione, slug } = await params;
  const c = await getCenter(regione, slug);
  if (!c) notFound();

  // schema.org LocalBusiness for search engines (AggregateRating comes with reviews in Sprint 3).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: c.name,
    description: c.description ?? undefined,
    telephone: c.phone ?? undefined,
    email: c.email ?? undefined,
    url: c.website ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: c.address ?? undefined,
      addressLocality: c.city ?? undefined,
      addressRegion: c.region,
      addressCountry: "IT",
    },
    geo: c.lat !== null && c.lng !== null ? { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng } : undefined,
  };

  const contacts = [
    c.phone && { label: "Telefono", text: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}` },
    c.whatsapp && { label: "WhatsApp", text: c.whatsapp, href: whatsappUrl(c.whatsapp) },
    c.email && { label: "Email", text: c.email, href: `mailto:${c.email}` },
    c.website && { label: "Sito web", text: c.website.replace(/^https?:\/\//, ""), href: c.website },
    c.instagram && { label: "Instagram", text: c.instagram, href: c.instagram.startsWith("http") ? c.instagram : `https://instagram.com/${c.instagram.replace(/^@/, "")}` },
  ].filter(Boolean) as { label: string; text: string; href: string }[];

  const primaryContact = contacts.find((x) => x.label === "WhatsApp") ?? contacts.find((x) => x.label === "Telefono") ?? contacts[0];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:pb-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Percorso" className="text-sm text-muted-foreground">
        <Link href="/diving" className="hover:text-primary">Diving</Link>
        {" / "}
        <Link href={`/diving/${regionSlug(c.region)}`} className="hover:text-primary">{c.region}</Link>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
            <p className="text-muted-foreground">{location(c)}, {c.region}</p>
            <CenterBadges center={c} />
            {c.languages.length > 0 && (
              <p className="text-sm">
                <span className="text-muted-foreground">Lingue: </span>
                {c.languages.map((l) => label(LANGUAGE_LABELS, l)).join(", ")}
              </p>
            )}
          </header>

          <section aria-labelledby="descrizione">
            <h2 id="descrizione" className="text-lg font-medium">Descrizione</h2>
            <p className="mt-2 text-sm leading-relaxed">{c.description ?? "Descrizione non ancora disponibile."}</p>
          </section>

          {c.services.length > 0 && (
            <section aria-labelledby="servizi">
              <h2 id="servizi" className="text-lg font-medium">Servizi</h2>
              <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {c.services.map((s) => <li key={s}>{label(SERVICE_LABELS, s)}</li>)}
              </ul>
            </section>
          )}

          <section aria-labelledby="recensioni">
            <h2 id="recensioni" className="text-lg font-medium">Recensioni</h2>
            <div className="mt-2 rounded-lg border border-dashed p-6 text-center">
              <p className="font-medium">Nessuna recensione</p>
              <p className="mt-1 text-sm text-muted-foreground">Le recensioni arriveranno presto.</p>
            </div>
          </section>

          {c.lat !== null && c.lng !== null && (
            <section aria-labelledby="mappa">
              <h2 id="mappa" className="mb-2 text-lg font-medium">Dove si trova</h2>
              {c.address && <p className="mb-2 text-sm">{c.address}, {c.city}</p>}
              <MapPanel centers={[c]} desktopHeight="lg:h-80" />
            </section>
          )}
        </div>

        <aside aria-labelledby="contatti" className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div id="contatta" className="rounded-lg border p-4">
            <h2 id="contatti" className="font-medium">Contatti</h2>
            {contacts.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nessun contatto disponibile.</p>
            ) : (
              <dl className="mt-3 space-y-2 text-sm">
                {contacts.map((x) => (
                  <div key={x.label}>
                    <dt className="text-muted-foreground">{x.label}</dt>
                    <dd><a href={x.href} className="break-all text-primary underline-offset-4 hover:underline" rel="noopener" target={x.href.startsWith("http") ? "_blank" : undefined}>{x.text}</a></dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {c.verified_at && (
            <p className="text-xs text-muted-foreground">
              Dati verificati il {new Date(c.verified_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
          {c.status === "unclaimed" && (
            <p className="text-xs text-muted-foreground">
              Sei il titolare?{" "}
              <Link href={`/rivendica/${c.slug}`} className="text-primary underline-offset-4 hover:underline">Rivendica questa scheda</Link>
            </p>
          )}
        </aside>
      </div>

      {primaryContact && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-background p-3 lg:hidden">
          <a href={primaryContact.href} className={buttonVariants({ className: "h-11 w-full" })}>
            Contatta via {primaryContact.label.toLowerCase()}
          </a>
        </div>
      )}
    </main>
  );
}
