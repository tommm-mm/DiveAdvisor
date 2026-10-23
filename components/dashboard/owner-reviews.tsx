import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saveOwnerReply } from "@/app/dashboard/actions";
import { formatDate, reviewScore, type Review } from "@/lib/review-utils";

export type OwnerReview = Review & { center_id: string; status: string };

const one = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function OwnerReviews({ reviews, error, centerName }: { reviews: OwnerReview[]; error: boolean; centerName?: (id: string) => string }) {
  return (
    <section aria-labelledby="recensioni" className="mt-8">
      <h2 id="recensioni" className="text-lg font-medium">Recensioni</h2>
      <p className="mt-1 text-sm text-muted-foreground">Puoi rispondere pubblicamente a ogni recensione. Le recensioni non si possono cancellare.</p>
      {error ? (
        <p className="mt-2 text-sm text-destructive">Non riusciamo a caricare le recensioni. Ricarica la pagina.</p>
      ) : !reviews.length ? (
        <p className="mt-2 text-sm text-muted-foreground">Nessuna recensione ancora. Genera un codice e dallo ai tuoi subacquei.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{one(reviewScore(r))}</span>
                {r.verified ? <Badge>Verificata</Badge> : <Badge variant="outline">Non verificata</Badge>}
                {r.status === "pending" && <Badge variant="secondary">In moderazione</Badge>}
                <span className="text-sm text-muted-foreground">Immersione del {formatDate(r.dive_date)}</span>
              </div>
              {centerName && <p className="mt-1 text-xs text-muted-foreground">{centerName(r.center_id)}</p>}
              {r.text && <p className="mt-2 whitespace-pre-line text-sm">{r.text}</p>}
              {r.status === "published" && (
                <form action={saveOwnerReply} className="mt-3 space-y-2">
                  <input type="hidden" name="reviewId" value={r.id} />
                  <label htmlFor={`reply-${r.id}`} className="block text-sm font-medium">La tua risposta pubblica</label>
                  <textarea id={`reply-${r.id}`} name="reply" rows={3} maxLength={1000} defaultValue={r.owner_reply ?? ""}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
                  <Button type="submit" variant="outline" size="sm">{r.owner_reply ? "Aggiorna risposta" : "Pubblica risposta"}</Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
