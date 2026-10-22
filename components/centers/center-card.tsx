import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CenterBadges } from "@/components/centers/center-badges";
import { centerPath, type Center } from "@/lib/centers";

export function CenterCard({ center }: { center: Center }) {
  return (
    <article className="rounded-lg border p-4">
      <h2 className="font-medium">
        <Link href={centerPath(center)} className="hover:text-primary">{center.name}</Link>
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {[center.city, center.province && `(${center.province})`].filter(Boolean).join(" ")}, {center.region}
      </p>
      <div className="mt-3"><CenterBadges center={center} /></div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">Nessuna recensione</span>
        <Link href={centerPath(center)} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Vedi scheda
        </Link>
      </div>
    </article>
  );
}
