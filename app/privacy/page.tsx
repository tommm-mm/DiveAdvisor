import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice, contactLine } from "@/components/legal-draft";

export const metadata: Metadata = {
  title: "Informativa privacy",
  description: "Come DiveAdvisor tratta i dati personali di subacquei e diving: quali dati, perché, per quanto tempo e quali sono i tuoi diritti.",
  alternates: { canonical: "/privacy" },
};

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 text-xl font-semibold">{children}</h2>;

export default function PrivacyPage() {
  const contact = contactLine();
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-3xl font-semibold tracking-tight">Informativa privacy</h1>
      <LegalDraftNotice updated="24 ottobre 2026" />

      <H>Chi è il titolare</H>
      <p>Il titolare del trattamento è Tommaso Mocenigo, che gestisce DiveAdvisor come persona fisica. Contatto: {contact}.</p>

      <H>Quali dati trattiamo e perché</H>
      <ul>
        <li><strong>Account</strong> (email; nome visualizzato se lo indichi): per farti accedere con il link via email. Base giuridica: esecuzione del servizio che richiedi.</li>
        <li><strong>Messaggi ai diving</strong> (nome, email, testo): li salviamo e li inoltriamo al diving che hai scelto, solo perché ti possa rispondere. Registriamo anche i click su WhatsApp e telefono, senza dati su di te.</li>
        <li><strong>Recensioni</strong> (voti, testo, data dell&apos;immersione, eventuale codice): le pubblichiamo in forma anonima, senza nome né email. Base giuridica: esecuzione del servizio.</li>
        <li><strong>Segnalazioni e richieste</strong> (rivendicazione, rimozione, segnalazione di contenuti): per gestirle e rispondere.</li>
        <li><strong>Dati dei diving</strong> (nome dell&apos;attività, indirizzo, telefono, email, sito, servizi): dati pubblici di attività commerciali, pubblicati per offrire ai subacquei un elenco completo. Base giuridica: legittimo interesse. Il titolare dell&apos;attività può opporsi e chiedere la rimozione in qualsiasi momento dalla pagina <Link href="/rimuovi-scheda" className="text-primary underline">Rimuovi la tua scheda</Link>.</li>
        <li><strong>Statistiche</strong>: contiamo le visite alle pagine in forma aggregata (per esempio &quot;scheda X, giorno Y, N visite&quot;), senza cookie, senza indirizzi IP e senza profilazione.</li>
      </ul>

      <H>Cookie</H>
      <p>Usiamo solo cookie tecnici necessari per mantenere l&apos;accesso al tuo account. Niente cookie di profilazione o pubblicità, quindi nessun banner.</p>
      <p>I video YouTube nelle schede si caricano solo se premi play (dominio youtube-nocookie.com); da quel momento si applica l&apos;informativa di Google. I link Instagram aprono il sito di Instagram.</p>

      <H>A chi affidiamo i dati</H>
      <p>Usiamo fornitori che trattano i dati per nostro conto, con accordi conformi al GDPR:</p>
      <ul>
        <li>Supabase (database, accesso e foto), server nell&apos;Unione europea (Francoforte).</li>
        <li>Vercel (hosting del sito), con elaborazione nell&apos;Unione europea (Francoforte).</li>
        <li>Resend (invio delle email).</li>
        <li>Cloudflare Turnstile (protezione anti-spam dei moduli).</li>
      </ul>
      <p>Alcuni di questi fornitori hanno sede negli Stati Uniti: i trasferimenti avvengono con le garanzie previste dal GDPR (clausole contrattuali standard o EU-US Data Privacy Framework). I tuoi messaggi arrivano anche al diving a cui scrivi, che li tratta come titolare autonomo per risponderti.</p>

      <H>Per quanto tempo</H>
      <ul>
        <li>Account e recensioni: finché non chiedi la cancellazione.</li>
        <li>Messaggi ai diving: fino a 24 mesi, poi li eliminiamo.</li>
        <li>Richieste e segnalazioni: fino a 24 mesi dalla chiusura.</li>
      </ul>

      <H>I tuoi diritti</H>
      <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità dei tuoi dati e opporti al trattamento basato sul legittimo interesse, scrivendo a {contact}. Puoi anche presentare reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).</p>

      <H>Età minima</H>
      <p>Per creare un account e scrivere recensioni devi avere almeno 14 anni.</p>
    </main>
  );
}
