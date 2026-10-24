import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { centerPath } from "@/lib/centers";
import { Badge } from "@/components/ui/badge";
import { createCodeCards, setLeadStatus } from "./actions";
import { CodesSection, type Code } from "@/components/dashboard/codes-section";
import { OwnerReviews, type OwnerReview } from "@/components/dashboard/owner-reviews";
import { CopyButton } from "@/components/copy-button";
import { InviteSection } from "@/components/dashboard/invite-section";

export const metadata: Metadata = { title: "Area diving", robots: { index: false } };

const CHANNEL: Record<string, string> = { form: "Modulo", whatsapp: "WhatsApp", phone: "Telefono" };
const fmt = (d: string) =>
  new Date(d).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();
  const [{ data: centers }, { data: claims }] = await Promise.all([
    supabase.from("dive_centers").select("id, slug, name, region").eq("owner_id", user.id).order("name"),
    supabase.from("claim_requests").select("id, status, created_at, dive_centers(name)").eq("status", "pending"),
  ]);

  if (!centers?.length) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Area diving</h1>
        {claims?.length ? (
          <p className="mt-3 text-muted-foreground">
            Abbiamo ricevuto la tua richiesta per {claims.map((c) => (c.dive_centers as unknown as { name: string } | null)?.name).join(", ")}. Ti scriveremo appena verificata.
          </p>
        ) : (
          <p className="mt-3 text-muted-foreground">
            Non gestisci ancora nessuna scheda. Cerca il tuo diving e scegli &quot;Rivendica questa scheda&quot;.
          </p>
        )}
        <Link href="/diving" className="mt-4 inline-block text-primary underline-offset-4 hover:underline">Cerca il tuo diving</Link>
      </main>
    );
  }

  const ids = centers.map((c) => c.id);
  const [{ data: leads, error }, { data: codes, error: codesError }, { data: reviews, error: reviewsError }] = await Promise.all([
    supabase.from("leads").select("id, center_id, name, email, message, channel, status, created_at")
      .in("center_id", ids).order("created_at", { ascending: false }).limit(100),
    supabase.from("verification_codes").select("id, center_id, code, created_at, expires_at, used_at, max_uses, use_count")
      .in("center_id", ids).order("created_at", { ascending: false }).limit(30),
    // RLS ("reviews: owner read own centre") returns published and pending reviews, never rejected ones.
    supabase.from("reviews").select("id, center_id, status, dive_date, verified, text, owner_reply, owner_reply_at, created_at, score_safety, score_equipment, score_briefing, score_group, score_environment, score_value")
      .in("center_id", ids).order("created_at", { ascending: false }).limit(100),
  ]);
  const since30 = new Date(Date.now() - 30 * 86400_000);
  // RLS ("views: owner read") limits this to the owner's centres.
  const { data: views } = await supabase.from("center_daily_views").select("views")
    .in("center_id", ids).gte("day", since30.toISOString().slice(0, 10));
  const views30 = views?.reduce((sum, v) => sum + v.views, 0) ?? 0;
  const leads30 = leads?.filter((l) => l.created_at >= since30.toISOString()).length ?? 0;
  const published = reviews?.filter((r) => r.status === "published").length ?? 0;
  // Links in codes/QR point at the host serving this page (preview or production).
  const h = await headers();
  const siteUrl = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const centerName = (id: string) => centers.find((c) => c.id === id)?.name ?? "";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Area diving</h1>
      <ul className="mt-2 flex flex-wrap gap-x-4 text-sm">
        {centers.map((c) => (
          <li key={c.id} className="flex flex-wrap gap-x-3">
            <Link href={centerPath(c)} className="text-primary underline-offset-4 hover:underline">{c.name}</Link>
            <Link href={`/dashboard/scheda/${c.id}`} className="text-primary underline-offset-4 hover:underline">Modifica scheda</Link>
          </li>
        ))}
      </ul>

      <section aria-label="Statistiche" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Visite alla scheda", value: views30, hint: "ultimi 30 giorni" },
          { label: "Contatti", value: leads30, hint: "ultimi 30 giorni" },
          { label: "Da gestire", value: leads?.filter((l) => l.status === "new").length ?? 0, hint: "contatti nuovi" },
          { label: "Recensioni", value: published, hint: "pubblicate" },
        ].map((t) => (
          <div key={t.label} className="rounded-2xl border p-4">
            <p className="text-sm text-muted-foreground">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold">{t.value}</p>
            <p className="text-xs text-muted-foreground">{t.hint}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="contatti" className="mt-8">
        <h2 id="contatti" className="text-lg font-medium">Contatti ricevuti</h2>
        {error ? (
          <p className="mt-2 text-sm text-destructive">Non riusciamo a caricare i contatti. Ricarica la pagina.</p>
        ) : !leads?.length ? (
          <p className="mt-2 text-sm text-muted-foreground">Nessun contatto ancora. Arriveranno qui appena un subacqueo ti scrive.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {leads.map((l) => (
              <li key={l.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={l.status === "new" ? "default" : "secondary"}>{l.status === "new" ? "Nuovo" : "Risposto"}</Badge>
                    <span className="text-sm">{CHANNEL[l.channel] ?? l.channel}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{fmt(l.created_at)}</span>
                </div>
                {centers.length > 1 && <p className="mt-1 text-xs text-muted-foreground">{centerName(l.center_id)}</p>}
                {l.channel === "form" ? (
                  <>
                    <p className="mt-2 text-sm font-medium">
                      {l.name} · <a href={`mailto:${l.email}`} className="text-primary underline-offset-4 hover:underline">{l.email}</a>
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm">{l.message}</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Click sul link {CHANNEL[l.channel]?.toLowerCase()} dalla scheda.</p>
                )}
                <form action={setLeadStatus} className="mt-3">
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="status" value={l.status === "new" ? "replied" : "new"} />
                  <button type="submit" className="text-sm text-primary underline-offset-4 hover:underline">
                    {l.status === "new" ? "Segna come risposto" : "Segna come nuovo"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="invita" className="mt-8">
        <h2 id="invita" className="text-lg font-medium">Chiedi una recensione</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dopo l&apos;immersione manda un link nel gruppo WhatsApp della barca: ognuno lascia la sua recensione verificata.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {centers.map((c) => <InviteSection key={c.id} centerId={c.id} centerName={centers.length > 1 ? c.name : undefined} />)}
        </div>
      </section>

      <section aria-labelledby="strumenti" className="mt-8">
        <h2 id="strumenti" className="text-lg font-medium">Strumenti per farti trovare</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {centers.map((c) => {
            const snippet = `<a href="${siteUrl}${centerPath(c)}"><img src="${siteUrl}/api/badge/${c.slug}" alt="Recensioni su DiveAdvisor" width="220" height="64"></a>`;
            return (
              <div key={c.id} className="space-y-4 rounded-2xl border p-4">
                {centers.length > 1 && <p className="font-medium">{c.name}</p>}
                <div>
                  <p className="text-sm font-medium">Card per recensioni verificate</p>
                  <p className="text-sm text-muted-foreground">Un foglio A4 con 8 card da ritagliare, ognuna con il suo QR. Dai una card a ogni subacqueo dopo l&apos;immersione: la recensione è verificata in automatico. Valgono 6 mesi.</p>
                  <form action={createCodeCards} className="mt-1 flex flex-wrap items-center gap-x-4">
                    <input type="hidden" name="centerId" value={c.id} />
                    <button type="submit" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Genera e stampa 8 card</button>
                    <Link href={`/dashboard/card/${c.id}`} className="text-sm text-muted-foreground underline-offset-4 hover:underline">Ristampa le card non usate</Link>
                  </form>
                </div>
                <div>
                  <p className="text-sm font-medium">Poster con QR</p>
                  <p className="text-sm text-muted-foreground">Da mettere al bancone o in barca: invita i clienti a chiedere la card.</p>
                  <Link href={`/dashboard/poster/${c.id}`} className="text-sm text-primary underline-offset-4 hover:underline">Apri il poster</Link>
                </div>
                <div>
                  <p className="text-sm font-medium">Badge per il tuo sito</p>
                  <p className="text-sm text-muted-foreground">Mostra il tuo voto e porta i visitatori alla tua scheda. Incolla questo codice nel sito.</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/badge/${c.slug}`} alt="Anteprima del badge" width={220} height={64} className="my-2" />
                  <CopyButton value={snippet} label="Copia il codice del badge" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <CodesSection
        centers={centers.map((c) => ({ id: c.id, name: c.name, reviewUrl: `${siteUrl}${centerPath(c)}/recensione` }))}
        codes={(codes ?? []) as Code[]} error={!!codesError} />
      <OwnerReviews reviews={(reviews ?? []) as OwnerReview[]} error={!!reviewsError}
        centerName={centers.length > 1 ? centerName : undefined} />
    </main>
  );
}
