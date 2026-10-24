import type { Metadata } from "next";
import { LegalDraftNotice } from "@/components/legal-draft";

export const metadata: Metadata = {
  title: "Come verifichiamo le recensioni",
  description: "Recensioni verificate con un codice del diving, moderazione delle non verificate, regole e segnalazioni: come funzionano le recensioni su DiveAdvisor.",
  alternates: { canonical: "/come-verifichiamo-le-recensioni" },
};

// Required by the Italian Consumer Code (art. 21, Omnibus directive): explain whether and how reviews are verified.
export default function HowWeVerifyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-3xl font-semibold tracking-tight">Come verifichiamo le recensioni</h1>
      <LegalDraftNotice updated="24 ottobre 2026" />

      <h2 className="mt-8 text-xl font-semibold">Recensioni verificate</h2>
      <p>Dopo l&apos;immersione il diving dà al subacqueo un codice personale: una card stampata con QR (valida 6 mesi) oppure un codice inviato via link (valido 30 giorni). Ogni codice vale una sola volta. Chi recensisce con il codice dimostra di aver fatto un&apos;immersione con quel diving: la recensione viene pubblicata subito con l&apos;etichetta &quot;Verificata&quot;.</p>

      <h2 className="mt-8 text-xl font-semibold">Recensioni non verificate</h2>
      <p>Si può recensire anche senza codice. In questo caso la recensione viene controllata da noi prima della pubblicazione e mostra l&apos;etichetta &quot;Non verificata&quot;. Per limitare gli abusi, senza codice si può scrivere al massimo una recensione ogni 30 giorni per lo stesso diving.</p>

      <h2 className="mt-8 text-xl font-semibold">Cosa controlliamo</h2>
      <ul>
        <li>Ogni recensione richiede un account e supera un controllo anti-spam.</li>
        <li>Rifiutiamo recensioni con insulti, dati personali, pubblicità, contenuti non legati a un&apos;immersione o scritte in evidente conflitto di interessi.</li>
        <li>Non modifichiamo il testo delle recensioni e non le ordiniamo in base a sponsorizzazioni.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Ordine e voti</h2>
      <p>Mostriamo prima le recensioni verificate, poi le altre, dalla più recente. Il voto di ogni diving è la media dei sei criteri (sicurezza, attrezzatura, briefing, dimensione del gruppo, ambiente, rapporto qualità/prezzo) di tutte le recensioni pubblicate.</p>

      <h2 className="mt-8 text-xl font-semibold">Risposte e segnalazioni</h2>
      <p>I diving possono rispondere pubblicamente ma non possono cancellare le recensioni. Chiunque può segnalare una recensione con il link &quot;Segnala&quot;: la esaminiamo e, se viola le regole, la rimuoviamo spiegando il motivo all&apos;autore.</p>
    </main>
  );
}
