import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { turnstileSiteKey } from "@/lib/turnstile";
import { RemovalForm } from "@/components/removal-form";

export const metadata: Metadata = {
  title: "Rimuovi la scheda del tuo diving",
  description: "Sei il titolare di un diving e vuoi che la scheda non compaia su DiveAdvisor? Invia la richiesta: la gestiamo entro 7 giorni.",
  alternates: { canonical: "/rimuovi-scheda" },
};

export default async function RemovalPage({ searchParams }: { searchParams: Promise<{ scheda?: string }> }) {
  const { scheda } = await searchParams;
  const { data: center } = scheda
    ? await createPublicClient().from("dive_centers").select("slug, name").eq("slug", scheda).maybeSingle()
    : { data: null };
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Rimuovi la scheda del tuo diving</h1>
      <p className="mt-3 text-muted-foreground">
        Pubblichiamo solo dati pubblici delle attività. Se sei il titolare e preferisci non comparire, inviaci la richiesta:
        verifichiamo che sei tu e rimuoviamo la scheda entro 7 giorni.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Prima di decidere: puoi anche rivendicare la scheda gratis e gestire tu dati, foto e risposte alle recensioni.
      </p>
      <div className="mt-6">
        <RemovalForm siteKey={turnstileSiteKey()} centerSlug={center?.slug} centerName={center?.name} />
      </div>
    </main>
  );
}
