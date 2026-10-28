"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reviewSuggestion } from "@/app/admin/actions";
import { BUSINESS_TYPE_LABELS, label } from "@/lib/labels";

type Suggestion = {
  id: string; name: string; city: string; region: string | null; business_types: string[];
  contact_email: string; phone: string | null; website: string | null; source: string; created_at: string;
};

// Requests from /aggiungi-attivita and /eudi. Approve creates the listing and opens it to complete.
export function SuggestionsInbox({ items }: { items: Suggestion[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const act = (id: string, status: "approved" | "rejected") => start(async () => {
    setError(null);
    const res = await reviewSuggestion(id, status);
    if (!res.ok) return setError(res.message ?? "Non riuscito. Riprova.");
    if (status === "approved" && res.centerId) router.push(`/admin/${res.centerId}?nuova=1`);
    else router.refresh();
  });

  return (
    <section aria-labelledby="richieste" className="rounded-2xl border border-primary/30 bg-background p-5">
      <h2 id="richieste" className="font-sans text-lg font-semibold">Richieste da approvare <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-sm text-primary-foreground">{items.length}</span></h2>
      <p className="text-sm text-muted-foreground">Arrivate dal modulo pubblico. Approva per creare la scheda, poi completala.</p>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      <ul className="mt-4 divide-y">
        {items.map((s) => (
          <li key={s.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-muted-foreground">
                {s.city}{s.region ? `, ${s.region}` : ""} · {s.business_types.map((t) => label(BUSINESS_TYPE_LABELS, t)).join(", ")} · {s.contact_email}
                {s.website && <> · <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">sito</a></>}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={() => act(s.id, "rejected")}
                className="h-11 rounded-xl border px-4 text-sm font-medium hover:border-destructive hover:text-destructive disabled:opacity-50">Rifiuta</button>
              <button type="button" disabled={pending || !s.region} onClick={() => act(s.id, "approved")}
                title={s.region ? undefined : "Manca la regione"}
                className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Approva</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
