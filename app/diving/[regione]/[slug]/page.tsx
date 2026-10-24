import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { CenterBadges } from "@/components/centers/center-badges";
import { MapPanel } from "@/components/centers/map-panel";
import { CenterPhoto } from "@/components/centers/center-photo";
import { VideoList } from "@/components/centers/video-list";
import { ViewBeacon } from "@/components/centers/view-beacon";
import { parseVideo, type Video } from "@/lib/videos";
import { photoUrl } from "@/lib/photos";
import { centerPath, getCenter, isTestCenter, regionSlug, sortedPhotos, type Center } from "@/lib/centers";
import { BUSINESS_TYPE_LABELS, LANGUAGE_LABELS, SERVICE_LABELS, label } from "@/lib/labels";
import { ContactForm } from "@/components/centers/contact-form";
import { TrackedLink } from "@/components/centers/tracked-link";
import { turnstileSiteKey } from "@/lib/turnstile";
import { getPublishedReviews, getRating } from "@/lib/reviews";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { JsonLd, breadcrumbLd } from "@/components/json-ld";
import { siteUrl } from "@/lib/site";

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
    robots: isTestCenter(c) ? { index: false } : undefined,
  };
}

export default async function CenterPage({ params }: Props) {
  const { regione, slug } = await params;
  const c = await getCenter(regione, slug);
  if (!c) notFound();
  const [{ reviews, error: reviewsError }, rating] = await Promise.all([getPublishedReviews(c.id), getRating(c.id)]);
  const photos = sortedPhotos(c);
  const videos = c.video_urls.map(parseVideo).filter((v): v is Video => v !== null);

  // schema.org LocalBusiness for search engines, with AggregateRating once there are published reviews.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: c.name,
    image: photos.length ? photos.map((p) => photoUrl(p.path)) : undefined,
    url: `${siteUrl()}${centerPath(c)}`,
    description: c.description ?? undefined,
    telephone: c.phone ?? undefined,
    email: c.email ?? undefined,
    sameAs: [c.website, c.instagram?.startsWith("http") ? c.instagram : undefined].filter(Boolean),
    address: {
      "@type": "PostalAddress",
      streetAddress: c.address ?? undefined,
      addressLocality: c.city ?? undefined,
      addressRegion: c.region,
      addressCountry: "IT",
    },
    geo: c.lat !== null && c.lng !== null ? { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng } : undefined,
    aggregateRating: rating?.review_count
      ? { "@type": "AggregateRating", ratingValue: Number(rating.avg_overall), reviewCount: rating.review_count, bestRating: 5, worstRating: 1 }
      : undefined,
  };

  const contacts = [
    c.whatsapp && { label: "WhatsApp", text: c.whatsapp, href: whatsappUrl(c.whatsapp), track: "whatsapp" as const },
    c.phone && { label: "Telefono", text: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}`, track: "phone" as const },
    c.email && { label: "Email", text: c.email, href: `mailto:${c.email}` },
    c.website && { label: "Sito web", text: c.website.replace(/^https?:\/\//, ""), href: c.website },
    c.instagram && { label: "Instagram", text: c.instagram, href: c.instagram.startsWith("http") ? c.instagram : `https://instagram.com/${c.instagram.replace(/^@/, "")}` },
  ].filter(Boolean) as { label: string; text: string; href: string; track?: "whatsapp" | "phone" }[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:pb-6">
      <ViewBeacon centerId={c.id} />
      <JsonLd data={[jsonLd, breadcrumbLd([
        { name: "Diving", path: "/diving" },
        { name: c.region, path: `/diving/${regionSlug(c.region)}` },
        { name: c.name, path: centerPath(c) },
      ])]} />

      <nav aria-label="Percorso" className="text-sm text-muted-foreground">
        <Link href="/diving" className="hover:text-primary">Diving</Link>
        {" / "}
        <Link href={`/diving/${regionSlug(c.region)}`} className="hover:text-primary">{c.region}</Link>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <header className="space-y-2">
            <CenterPhoto photo={photos[0]} seed={c.slug} alt={c.name} priority className="mb-2 h-56 rounded-2xl sm:h-72" sizes="(min-width: 1024px) 760px, 100vw" />
            {photos.length > 1 && (
              <ul className="mb-4 flex snap-x gap-2 overflow-x-auto pb-1" aria-label="Altre foto">
                {photos.slice(1).map((p) => (
                  <li key={p.path} className="shrink-0 snap-start">
                    <a href={photoUrl(p.path)} target="_blank" rel="noopener" className="block">
                      <CenterPhoto photo={p} seed={c.slug} alt={c.name} className="h-20 w-28 rounded-xl sm:h-24 sm:w-36" sizes="144px" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <h1 className="text-3xl font-semibold tracking-tight">{c.name}</h1>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              {c.business_types.map((t) => label(BUSINESS_TYPE_LABELS, t)).join(" · ")}
            </p>
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

          {videos.length > 0 && (
            <section aria-labelledby="video">
              <h2 id="video" className="text-lg font-medium">Video</h2>
              <VideoList videos={videos} centerName={c.name} />
            </section>
          )}

          <ReviewsSection reviews={reviews} rating={rating} error={reviewsError} writeUrl={`${centerPath(c)}/recensione`} />

          {c.lat !== null && c.lng !== null && (
            <section aria-labelledby="mappa">
              <h2 id="mappa" className="mb-2 text-lg font-medium">Dove si trova</h2>
              {c.address && <p className="mb-2 text-sm">{c.address}, {c.city}</p>}
              <MapPanel centers={[{ id: c.id, slug: c.slug, name: c.name, region: c.region, city: c.city, lat: c.lat, lng: c.lng }]} desktopHeight="lg:h-80" />
            </section>
          )}
        </div>

        <aside aria-labelledby="contatti" className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div id="contatta" className="scroll-mt-4 rounded-2xl border p-4 shadow-sm">
            <h2 id="contatti" className="font-medium">Scrivi al diving</h2>
            <div className="mt-3"><ContactForm centerId={c.id} siteKey={turnstileSiteKey()} /></div>
            {contacts.length > 0 && (
              <dl className="mt-5 space-y-2 border-t pt-4 text-sm">
                {contacts.map((x) => {
                  const linkProps = {
                    href: x.href,
                    className: "break-all text-primary underline-offset-4 hover:underline",
                    rel: "noopener nofollow",
                    target: x.href.startsWith("http") ? "_blank" : undefined,
                    children: x.text,
                  };
                  return (
                    <div key={x.label}>
                      <dt className="text-muted-foreground">{x.label}</dt>
                      <dd>{x.track ? <TrackedLink {...linkProps} centerId={c.id} channel={x.track} /> : <a {...linkProps} />}</dd>
                    </div>
                  );
                })}
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
              {" · "}
              <Link href={`/rimuovi-scheda?scheda=${c.slug}`} className="underline-offset-4 hover:underline">Chiedi la rimozione</Link>
            </p>
          )}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-3 lg:hidden">
        <a href="#contatta" className={buttonVariants({ className: "h-11 w-full" })}>Contatta</a>
      </div>
    </main>
  );
}
