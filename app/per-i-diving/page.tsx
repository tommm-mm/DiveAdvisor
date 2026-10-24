import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Per i diving: scheda gratuita, contatti e recensioni verificate",
  description: "Rivendica gratis la scheda del tuo diving su DiveAdvisor: ricevi contatti diretti dai subacquei e raccogli recensioni verificate. Gratis il primo anno.",
  alternates: { canonical: "/per-i-diving" },
};

const STEPS = [
  { title: "Trova la tua scheda", text: "Molti diving sono già in elenco con i dati pubblici. Cerca il tuo per nome." },
  { title: "Rivendicala", text: "Accedi con la tua email e dimostraci che sei il titolare. Verifichiamo ogni richiesta a mano." },
  { title: "Ricevi contatti e recensioni", text: "I subacquei ti scrivono direttamente. Dopo l'immersione dai loro un codice per una recensione verificata." },
];

const FEATURES = [
  { title: "Contatti diretti, senza commissioni", text: "Email dal modulo della scheda e click su WhatsApp e telefono, tutti nella tua area riservata." },
  { title: "Recensioni verificate", text: "Dai una card con QR a ogni cliente: la recensione è legata a un'immersione reale e viene pubblicata subito." },
  { title: "Rispondi pubblicamente", text: "Puoi rispondere a ogni recensione. Nessuno può cancellarle, nemmeno noi su richiesta del diving: è ciò che le rende credibili." },
  { title: "Scheda sempre aggiornata", text: "Servizi, federazioni, lingue, contatti. Le modifiche sono online subito." },
];

const FAQ = [
  { q: "Quanto costa?", a: "Il primo anno è gratuito, senza carta di credito e senza impegno. Prima della fine ti diremo in anticipo cosa cambia, e potrai decidere liberamente." },
  { q: "Il mio diving è già in elenco senza che l'abbia chiesto. Perché?", a: "Pubblichiamo solo dati pubblici e verificati dei diving italiani, per dare ai subacquei un elenco completo. Puoi rivendicare la scheda per gestirla, oppure chiederne la rimozione dalla pagina \"Rimuovi la tua scheda\" in fondo al sito." },
  { q: "Posso cancellare una recensione negativa?", a: "No. Puoi rispondere pubblicamente. Se una recensione viola le regole (insulti, dati personali, contenuti falsi) puoi segnalarla e la controlliamo." },
  { q: "Come funzionano i codici di verifica?", a: "Dalla tua area stampi un foglio di card con QR da dare ai clienti dopo l'immersione (valgono 6 mesi), oppure invii un codice via link (vale 30 giorni). Ogni codice vale una volta." },
  { q: "Lavoriamo con tutte le federazioni?", a: "Sì. DiveAdvisor è indipendente: PADI, SSI, CMAS, TDI, SDI, IANTD e tutte le altre, ricreativo e tecnico, mare e lago." },
];

export default function ForCentersPage() {
  return (
    <main>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }} />

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:pb-20 sm:pt-16">
          <p className="text-sm font-semibold opacity-90">Per diving, scuole sub e negozi</p>
          <h1 className="mt-2 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">Più subacquei, contatti diretti, recensioni vere</h1>
          <p className="mt-4 max-w-xl text-base opacity-90 sm:text-lg">Gestisci gratis la scheda del tuo diving su DiveAdvisor. Il primo anno non costa nulla.</p>
        </div>
      </section>

      <div className="mx-auto -mt-10 max-w-6xl px-4">
        <form action="/diving" className="grid gap-3 rounded-2xl border bg-background p-4 shadow-lg sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1">
            <label htmlFor="pd-name" className="px-1 text-sm font-semibold">Cerca il tuo diving</label>
            <input id="pd-name" name="q" type="search" required placeholder="Nome del diving"
              className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
          </div>
          <button type="submit" className={buttonVariants({ className: "h-11 rounded-xl px-6" })}>Trova la scheda</button>
        </form>
        <p className="mt-2 px-1 text-sm text-muted-foreground">Apri la scheda e scegli &quot;Rivendica questa scheda&quot;.</p>
      </div>

      <section aria-labelledby="come" className="mx-auto max-w-6xl px-4 pt-14">
        <h2 id="come" className="text-2xl font-semibold">Come funziona</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary" aria-hidden>{i + 1}</span>
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="cosa" className="mt-14 bg-sand">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="cosa" className="text-2xl font-semibold">Cosa ottieni</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-2xl border bg-card p-5">
                <p className="font-semibold">{f.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq" className="mx-auto max-w-3xl px-4 py-14">
        <h2 id="faq" className="text-2xl font-semibold">Domande frequenti</h2>
        <div className="mt-6 divide-y rounded-2xl border">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {f.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>+</span>
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="rounded-2xl bg-primary p-8 text-primary-foreground sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="text-2xl font-semibold">Il tuo diving non è in elenco?</h2>
            <p className="mt-1 opacity-90">Aggiungilo in un minuto, gratis. Verifichiamo noi i dati.</p>
          </div>
          <a href="/eudi#aggiungi" className={buttonVariants({ variant: "secondary", className: "mt-4 h-11 rounded-xl px-6 sm:mt-0" })}>Aggiungi la tua attività</a>
        </div>
      </section>
    </main>
  );
}
