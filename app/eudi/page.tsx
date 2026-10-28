import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SuggestBusinessForm } from "@/components/suggest-business-form";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "DiveAdvisor a EUDI 2027",
  description: "Diving, scuole sub e negozi: trova e rivendica gratis la tua scheda su DiveAdvisor. Subacquei: trova il diving per la prossima immersione.",
  alternates: { canonical: "/eudi" },
};

const WHY = [
  { title: "Contatti diretti", text: "I subacquei ti scrivono via email o WhatsApp, senza commissioni." },
  { title: "Recensioni verificate", text: "Un link nel gruppo WhatsApp dopo l'immersione: ogni cliente lascia la sua recensione verificata." },
  { title: "Gratis il primo anno", text: "Rivendica la scheda, aggiungi foto e servizi, rispondi alle recensioni." },
];

// Landing page for the QR codes on shirts, cards and stickers at EUDI (mobile first).
export default function EudiPage() {
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <main>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-10">
          <span className="rounded-full border border-primary-foreground/60 px-3 py-1 text-xs font-semibold">EUDI 2027</span>
          <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">Ci vediamo a EUDI</h1>
          <p className="mt-3 max-w-xl opacity-90">DiveAdvisor è la piattaforma per trovare e contattare diving, scuole sub e negozi in tutta Italia, con recensioni verificate.</p>
        </div>
      </section>

      <div className="mx-auto -mt-8 max-w-3xl px-4">
        <form action="/diving" className="space-y-3 rounded-2xl border bg-background p-4 shadow-lg">
          <h2 className="text-xl font-semibold">Hai un diving, una scuola o un negozio?</h2>
          <label htmlFor="eu-q" className="block text-sm font-semibold">Cerca la tua scheda</label>
          <input id="eu-q" name="q" type="search" required placeholder="Nome dell'attività"
            className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
          <button type="submit" className={buttonVariants({ className: "h-11 w-full rounded-xl" })}>Trova e rivendica gratis</button>
        </form>
      </div>

      <section aria-labelledby="perche" className="mx-auto max-w-3xl px-4 pt-12">
        <h2 id="perche" className="text-2xl font-semibold">Perché esserci</h2>
        <ol className="mt-5 space-y-5">
          {WHY.map((w, i) => (
            <li key={w.title} className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary" aria-hidden>{i + 1}</span>
              <div><p className="font-semibold">{w.title}</p><p className="mt-1 text-sm text-muted-foreground">{w.text}</p></div>
            </li>
          ))}
        </ol>
        <Link href="/per-i-diving" className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline">Scopri come funziona</Link>
      </section>

      <section aria-labelledby="aggiungi" className="mx-auto mt-10 max-w-3xl px-4">
        <div className="rounded-2xl bg-sand p-5">
          <h2 id="aggiungi" className="text-xl font-semibold">Non trovi la tua attività?</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Aggiungila in un minuto, verifichiamo noi i dati.</p>
          <SuggestBusinessForm siteKey={turnstileSiteKey()} source="eudi" />
        </div>
      </section>

      <section aria-labelledby="sub" className="mx-auto max-w-3xl space-y-3 px-4 py-12">
        <h2 id="sub" className="text-2xl font-semibold">Sei un subacqueo?</h2>
        <p className="text-sm text-muted-foreground">Trova il diving per la prossima immersione, o racconta com&apos;è andata l&apos;ultima.</p>
        <Link href="/diving" className={buttonVariants({ variant: "outline", className: "h-11 w-full rounded-xl" })}>Cerca un diving</Link>
        {instagram && <a href={instagram} target="_blank" rel="noopener" className="block text-sm text-primary underline-offset-4 hover:underline">Seguici su Instagram</a>}
        {contact && <p className="text-sm text-muted-foreground">Scrivici: <a href={`mailto:${contact}`} className="text-primary underline-offset-4 hover:underline">{contact}</a></p>}
      </section>
    </main>
  );
}
