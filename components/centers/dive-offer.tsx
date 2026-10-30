import { LEVELS, SPECIALTY_LABELS, euro, label } from "@/lib/labels";
import type { Center } from "@/lib/centers";

type Offer = Pick<Center, "levels" | "specialties" | "price_dive" | "price_pack" | "price_pack_dives" | "price_rental"
  | "price_course_ow" | "price_course_aow" | "prices_source" | "prices_updated_at">;

// "Immersioni e prezzi" on the centre page: levels/depths served, specialties and indicative prices.
export function DiveOffer({ center: c }: { center: Offer }) {
  const prices = [
    c.price_dive != null && { label: "Immersione singola", value: euro(c.price_dive) },
    c.price_pack != null && { label: c.price_pack_dives ? `Pacchetto ${c.price_pack_dives} immersioni` : "Pacchetto immersioni", value: euro(c.price_pack) },
    c.price_rental != null && { label: "Noleggio attrezzatura completa", value: euro(c.price_rental) },
    c.price_course_ow != null && { label: "Corso Open Water", value: euro(c.price_course_ow) },
    c.price_course_aow != null && { label: "Corso Advanced", value: euro(c.price_course_aow) },
  ].filter(Boolean) as { label: string; value: string }[];
  if (!c.levels.length && !c.specialties.length && !prices.length) return null;

  const updated = c.prices_updated_at
    ? new Date(c.prices_updated_at).toLocaleDateString("it-IT", { month: "long", year: "numeric" })
    : null;

  return (
    <section aria-labelledby="immersioni" className="space-y-4">
      <h2 id="immersioni" className="text-lg font-medium">Immersioni e prezzi</h2>
      {c.levels.length > 0 && (
        <div>
          <h3 className="text-sm text-muted-foreground">Livelli e profondità</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {LEVELS.map((l) => {
              const on = c.levels.includes(l.value);
              return (
                <li key={l.value} className={`rounded-xl border px-3 py-2 text-sm ${on ? "border-primary bg-primary/10" : "text-muted-foreground opacity-60"}`}>
                  <span className="font-medium">{l.label}</span> <span className="tabular-nums">{l.depth}</span>
                  <span className="sr-only">{on ? ": disponibile" : ": non disponibile"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {c.specialties.length > 0 && (
        <div>
          <h3 className="text-sm text-muted-foreground">Specialità</h3>
          <p className="mt-1 text-sm">{c.specialties.map((s) => label(SPECIALTY_LABELS, s)).join(" · ")}</p>
        </div>
      )}
      {prices.length > 0 && (
        <div>
          <h3 className="text-sm text-muted-foreground">Prezzi indicativi</h3>
          <dl className="mt-2 divide-y rounded-xl border text-sm">
            {prices.map((p) => (
              <div key={p.label} className="flex justify-between gap-4 px-3 py-2">
                <dt>{p.label}</dt>
                <dd className="font-semibold tabular-nums">{p.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            {[updated && `Aggiornati a ${updated}`, c.prices_source && `fonte: ${c.prices_source === "sito" ? "sito del diving" : "il diving"}`].filter(Boolean).join(", ")}
            {updated || c.prices_source ? ". " : ""}Prezzi indicativi: conferma sempre con il diving.
          </p>
        </div>
      )}
    </section>
  );
}
