import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { centerPath } from "@/lib/centers";
import { formatCode } from "@/lib/review-utils";
import { PrintButton } from "@/components/dashboard/print-button";

export const metadata: Metadata = { title: "Card recensione verificata", robots: { index: false } };

const fmt = (d: string) => new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });

// A4 sheet of cut-out cards. Each card carries its own single-use code inside the QR,
// so the diver scans and the review is verified with no typing.
export default async function CodeCardsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ da?: string }> }) {
  const [{ id }, { da }] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/dashboard/card/${id}`);
  const supabase = await createClient();
  const { data: c } = await supabase.from("dive_centers").select("id, slug, name, region, owner_id").eq("id", id).maybeSingle();
  if (!c || c.owner_id !== user.id) notFound();

  // The batch just created, or (opened later) the unused long-lived cards still valid.
  let query = supabase.from("verification_codes").select("code, expires_at")
    .eq("center_id", id).is("used_at", null).gt("expires_at", new Date().toISOString()).order("created_at").limit(8);
  query = da && !isNaN(Date.parse(da)) ? query.gte("created_at", da) : query.gt("expires_at", new Date(Date.now() + 60 * 86400_000).toISOString());
  const { data: codes } = await query;

  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}${centerPath(c)}/recensione?codice=`;
  const cards = await Promise.all((codes ?? []).map(async (k) => ({
    ...k,
    qr: await QRCode.toString(base + formatCode(k.code), { type: "svg", margin: 0, color: { dark: "#0f5e6e" } }),
  })));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary">Area diving</Link>
          <h1 className="text-2xl font-semibold tracking-tight">Card recensione verificata</h1>
          <p className="text-sm text-muted-foreground">Stampa in A4, ritaglia e dai una card a ogni subacqueo dopo l&apos;immersione. Ogni card vale una volta.</p>
        </div>
        {cards.length > 0 && <PrintButton label="Stampa le card" />}
      </div>
      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna card disponibile. Torna all&apos;area diving e genera un nuovo foglio.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-0 border border-dashed print:border-0">
          {cards.map((k) => (
            <li key={k.code} className="flex items-center gap-4 border border-dashed p-5 break-inside-avoid">
              <div className="w-28 shrink-0" role="img" aria-label={`QR della card ${formatCode(k.code)}`} dangerouslySetInnerHTML={{ __html: k.qr }} />
              <div className="min-w-0 space-y-1">
                <p className="font-heading text-lg font-bold text-primary">DiveAdvisor</p>
                <p className="text-sm font-semibold">Com&apos;è andata con {c.name}?</p>
                <p className="text-xs text-muted-foreground">Inquadra il QR: la tua recensione sarà verificata.</p>
                <p className="font-mono text-sm tracking-wider" data-testid="card-code">{formatCode(k.code)}</p>
                <p className="text-[10px] text-muted-foreground">Valida fino al {fmt(k.expires_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
