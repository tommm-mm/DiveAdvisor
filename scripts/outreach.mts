// "Your centre is listed" emails for unclaimed centres, to send by hand from our own address.
// Usage: node --env-file=.env.local --experimental-strip-types scripts/outreach.mts [https://site-url] > outreach.csv
// Output is CSV (email, subject, body) for a mail merge or copy-paste. Never commit the output.
// The email is also the GDPR art. 14 notice (data not collected from the person): send it within a month of listing.
import { createClient } from "@supabase/supabase-js";

const site = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://dive-advisor.vercel.app").replace(/\/$/, "");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const { data, error } = await db.from("dive_centers")
  .select("slug, name, region, email").is("owner_id", null).not("email", "is", null).order("region");
if (error) throw error;

const csv = (v: string) => `"${v.replace(/"/g, '""')}"`;
console.log("email,oggetto,testo");
for (const c of data.filter((c) => !c.name.startsWith("[TEST]"))) {
  const page = `${site}/diving/${slugify(c.region)}/${c.slug}`;
  const body = `Buongiorno,

sono Tommaso di DiveAdvisor, la nuova piattaforma per trovare e contattare i diving in Italia, con recensioni verificate.

${c.name} è già in elenco con i dati pubblici della vostra attività (nome, indirizzo, contatti e servizi presi dal vostro sito e da elenchi pubblici): ${page}

Potete rivendicare la scheda gratuitamente (il primo anno non costa nulla) per:
- aggiornare dati, servizi e foto;
- ricevere contatti diretti dai subacquei, senza commissioni;
- raccogliere recensioni verificate con un codice da dare ai clienti dopo l'immersione.

Per rivendicarla basta aprire la scheda e scegliere "Rivendica questa scheda".
Se invece preferite non comparire, potete chiedere la rimozione qui: ${site}/rimuovi-scheda?scheda=${c.slug}

Trattiamo questi dati come attività commerciale per offrire ai subacquei un elenco completo (legittimo interesse); potete opporvi in qualsiasi momento. Tutti i dettagli nell'informativa privacy: ${site}/privacy

Se avete domande rispondete pure a questa email.

Buone immersioni,
Tommaso
DiveAdvisor`;
  console.log([c.email!, `${c.name} è su DiveAdvisor`, body].map(csv).join(","));
}
