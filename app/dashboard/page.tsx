import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { centerPath } from "@/lib/centers";
import { Badge } from "@/components/ui/badge";
import { setLeadStatus } from "./actions";

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
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: leads, error } = await supabase
    .from("leads").select("id, center_id, name, email, message, channel, status, created_at")
    .in("center_id", ids).order("created_at", { ascending: false }).limit(100);
  const monthCount = leads?.filter((l) => l.created_at >= monthStart).length ?? 0;
  const centerName = (id: string) => centers.find((c) => c.id === id)?.name ?? "";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Area diving</h1>
      <ul className="mt-2 flex flex-wrap gap-x-4 text-sm">
        {centers.map((c) => (
          <li key={c.id}><Link href={centerPath(c)} className="text-primary underline-offset-4 hover:underline">{c.name}</Link></li>
        ))}
      </ul>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:max-w-sm">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Contatti questo mese</p>
          <p className="mt-1 text-2xl font-semibold">{monthCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Da gestire</p>
          <p className="mt-1 text-2xl font-semibold">{leads?.filter((l) => l.status === "new").length ?? 0}</p>
        </div>
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
    </main>
  );
}
