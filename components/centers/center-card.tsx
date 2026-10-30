import Link from "next/link";
import { CenterBadges } from "@/components/centers/center-badges";
import { CenterPhoto } from "@/components/centers/center-photo";
import { DiveSummary } from "@/components/centers/dive-summary";
import { centerPath, sortedPhotos, type Center } from "@/lib/centers";
import type { Rating } from "@/lib/review-utils";
import { BUSINESS_TYPE_LABELS, label } from "@/lib/labels";

const one = (n: number) => Number(n).toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function CenterCard({ center, rating }: { center: Center; rating?: Rating }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md">
      <CenterPhoto photo={sortedPhotos(center)[0]} seed={center.slug} alt={center.name} className="h-24 sm:h-32" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
      <div className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-sans text-base font-semibold leading-snug">
            {/* The stretched link makes the whole card clickable while keeping one focusable element. */}
            <Link href={centerPath(center)} className="after:absolute after:inset-0 focus-visible:outline-none group-focus-within:underline">
              {center.name}
            </Link>
          </h2>
          {rating?.review_count ? (
            <span className="shrink-0 text-sm font-semibold">
              {one(rating.avg_overall)} <span className="font-normal text-muted-foreground">({rating.review_count})</span>
            </span>
          ) : (
            <span className="shrink-0 text-xs text-muted-foreground">Nessuna recensione</span>
          )}
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          {center.business_types.map((t) => label(BUSINESS_TYPE_LABELS, t)).join(" · ")}
        </p>
        <p className="text-sm text-muted-foreground">
          {[center.city, center.province && `(${center.province})`].filter(Boolean).join(" ")}, {center.region}
        </p>
        <DiveSummary center={center} />
        <CenterBadges center={center} />
      </div>
    </article>
  );
}
