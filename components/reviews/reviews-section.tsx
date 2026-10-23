import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CRITERIA, formatDate, reviewScore, type Rating, type Review } from "@/lib/review-utils";
import { ReportForm } from "@/components/reviews/report-form";

const one = (n: number) => Number(n).toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type Props = { reviews: Review[]; rating: Rating | null; error: boolean; writeUrl: string };

export function ReviewsSection({ reviews, rating, error, writeUrl }: Props) {
  return (
    <section aria-labelledby="recensioni">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="recensioni" className="text-lg font-medium">Recensioni</h2>
        <Link href={writeUrl} className={buttonVariants({ variant: "outline", size: "sm" })}>Scrivi una recensione</Link>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-destructive">Non riusciamo a caricare le recensioni. Ricarica la pagina.</p>
      ) : !rating || reviews.length === 0 ? (
        <div className="mt-2 rounded-lg border border-dashed p-6 text-center">
          <p className="font-medium">Nessuna recensione ancora</p>
          <p className="mt-1 text-sm text-muted-foreground">Hai fatto un&apos;immersione qui? Racconta com&apos;è andata.</p>
        </div>
      ) : (
        <>
          <div className="mt-3 rounded-lg border p-4">
            <p>
              <span className="text-2xl font-semibold">{one(rating.avg_overall)}</span>
              <span className="text-sm text-muted-foreground"> su 5 · {rating.review_count} {rating.review_count === 1 ? "recensione" : "recensioni"}</span>
            </p>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {CRITERIA.map((c) => (
                <div key={c.key} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{c.label}</dt>
                  <dd className="font-medium">{one(rating[`avg_${c.key}`])}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            <Link href="/come-verifichiamo-le-recensioni" className="underline-offset-4 hover:underline">Come verifichiamo le recensioni</Link>
          </p>
          <ul className="mt-3 space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{one(reviewScore(r))}</span>
                  {r.verified
                    ? <Badge>Verificata</Badge>
                    : <Badge variant="outline" className="text-muted-foreground">Non verificata</Badge>}
                  <span className="text-sm text-muted-foreground">Immersione del {formatDate(r.dive_date)}</span>
                </div>
                {r.text && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{r.text}</p>}
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-primary">Voti per criterio</summary>
                  <dl className="mt-1 grid gap-x-6 sm:grid-cols-2">
                    {CRITERIA.map((c) => (
                      <div key={c.key} className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">{c.label}</dt>
                        <dd>{r[`score_${c.key}`]}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
                {r.owner_reply && (
                  <div className="mt-3 border-l-2 pl-3">
                    <p className="text-sm font-medium">Risposta del diving</p>
                    <p className="mt-1 whitespace-pre-line text-sm">{r.owner_reply}</p>
                  </div>
                )}
                <div className="mt-3"><ReportForm reviewId={r.id} /></div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
