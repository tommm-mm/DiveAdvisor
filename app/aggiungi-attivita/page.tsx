import type { Metadata } from "next";
import Link from "next/link";
import { SuggestBusinessForm } from "@/components/suggest-business-form";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "Aggiungi la tua attività | DiveAdvisor",
  description: "Diving, scuola sub o negozio non ancora su DiveAdvisor? Aggiungilo gratis: verifichiamo i dati e la scheda va online.",
  alternates: { canonical: "/aggiungi-attivita" },
};

// Public form for a business (or anyone who knows it) to request a new listing; reviewed by the team.
export default function AddBusinessPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-bold">Aggiungi un&apos;attività</h1>
      <p className="mt-2 text-muted-foreground">
        Diving, scuola sub o negozio: compila il modulo, verifichiamo i dati e la scheda va online gratis.
        Prima <Link href="/diving" className="text-primary underline-offset-4 hover:underline">cerca se esiste già</Link>: in quel caso puoi rivendicarla.
      </p>
      <div className="mt-6 rounded-2xl border p-5">
        <SuggestBusinessForm siteKey={turnstileSiteKey()} />
      </div>
    </main>
  );
}
