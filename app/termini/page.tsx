import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice, contactLine } from "@/components/legal-draft";

export const metadata: Metadata = {
  title: "Termini d'uso",
  description: "Le regole per usare DiveAdvisor: subacquei, recensioni e diving.",
  alternates: { canonical: "/termini" },
};

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 text-xl font-semibold">{children}</h2>;

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-3xl font-semibold tracking-tight">Termini d&apos;uso</h1>
      <LegalDraftNotice updated="24 ottobre 2026" />

      <H>1. Cos&apos;è DiveAdvisor</H>
      <p>DiveAdvisor è un elenco dei diving in Italia che permette di cercarli, contattarli e recensirli. Non organizziamo immersioni, non vendiamo corsi e non siamo parte dei rapporti tra subacquei e diving: ogni accordo, pagamento e responsabilità sull&apos;attività subacquea riguarda solo il subacqueo e il diving.</p>
      <p>Non verifichiamo la sicurezza, le certificazioni o l&apos;attrezzatura dei diving. Le informazioni nelle schede vengono da fonti pubbliche o dai titolari e potrebbero non essere aggiornate: verificale sempre con il diving.</p>

      <H>2. Account</H>
      <ul>
        <li>Per scrivere recensioni o gestire una scheda serve un account. Devi avere almeno 14 anni.</li>
        <li>Sei responsabile dell&apos;uso del tuo account e dell&apos;email con cui accedi.</li>
        <li>Puoi chiedere la cancellazione dell&apos;account in qualsiasi momento.</li>
      </ul>

      <H>3. Regole per le recensioni</H>
      <ul>
        <li>Recensisci solo immersioni che hai fatto davvero, con il diving recensito.</li>
        <li>Niente insulti, minacce, discriminazioni, dati personali di altri, pubblicità o link commerciali.</li>
        <li>Non recensire il tuo diving o un concorrente, e non scrivere recensioni in cambio di compensi o sconti.</li>
        <li>Le recensioni con codice del diving sono &quot;verificate&quot; e pubblicate subito; quelle senza codice sono &quot;non verificate&quot; e controllate prima della pubblicazione. <Link href="/come-verifichiamo-le-recensioni" className="text-primary underline">Come verifichiamo le recensioni</Link>.</li>
        <li>Pubblicando una recensione ci concedi il diritto, gratuito e non esclusivo, di mostrarla su DiveAdvisor e nei materiali che presentano il sito. Resti l&apos;autore del testo.</li>
        <li>Possiamo rifiutare o rimuovere recensioni che violano queste regole o la legge. Quando lo facciamo, l&apos;autore riceve una spiegazione.</li>
      </ul>

      <H>4. Per i diving</H>
      <ul>
        <li>Il titolare può rivendicare gratuitamente la scheda della propria attività, dimostrando di esserne il titolare. Il primo anno è gratuito; eventuali servizi a pagamento saranno comunicati in anticipo e saranno sempre facoltativi.</li>
        <li>Il titolare è responsabile dei dati, delle foto e dei video che pubblica e garantisce di avere i diritti per farlo.</li>
        <li>Il diving può rispondere pubblicamente alle recensioni ma non può cancellarle né modificarle. Può segnalare quelle che violano le regole.</li>
        <li>I codici di verifica vanno dati solo a chi ha fatto un&apos;immersione con il diving. Abusi (codici dati a sé stessi o in cambio di recensioni positive) comportano la rimozione delle recensioni e, nei casi gravi, della scheda.</li>
        <li>Il titolare può chiedere in qualsiasi momento la rimozione della scheda dalla pagina <Link href="/rimuovi-scheda" className="text-primary underline">Rimuovi la tua scheda</Link>. La gestiamo entro 7 giorni.</li>
      </ul>

      <H>5. Contenuti sponsorizzati</H>
      <p>Eventuali contenuti sponsorizzati o partner saranno sempre indicati come tali. Gli sponsor non influenzano mai voti, recensioni o posizione dei diving nei risultati.</p>

      <H>6. Segnalazioni</H>
      <p>Puoi segnalare un contenuto che ritieni illecito o contrario a queste regole con il link &quot;Segnala&quot; sotto ogni recensione o scrivendo a {contactLine()}. Esaminiamo le segnalazioni e comunichiamo l&apos;esito.</p>

      <H>7. Responsabilità</H>
      <p>Offriamo il servizio così com&apos;è e lavoriamo per renderlo accurato e disponibile, ma non possiamo garantire che sia sempre privo di errori o interruzioni. Nei limiti consentiti dalla legge non rispondiamo dei rapporti tra subacquei e diving né dei contenuti pubblicati dagli utenti.</p>

      <H>8. Modifiche e legge applicabile</H>
      <p>Possiamo aggiornare questi termini; le modifiche importanti saranno comunicate sul sito. Si applica la legge italiana; restano salvi i diritti inderogabili dei consumatori.</p>
    </main>
  );
}
