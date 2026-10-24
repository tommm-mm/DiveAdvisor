import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { centerPath } from "@/lib/centers";
import { PrintButton } from "@/components/dashboard/print-button";

export const metadata: Metadata = { title: "Poster recensioni", robots: { index: false } };

// A4 counter poster: QR to the centre's review form. The verification code still comes from staff,
// so a scan alone gives an unverified review; the poster says to ask for the code.
export default async function PosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/poster/${id}`);
  const supabase = await createClient();
  const { data: c } = await supabase.from("dive_centers").select("id, slug, name, region, owner_id").eq("id", id).maybeSingle();
  if (!c || c.owner_id !== user.id) notFound();

  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}${centerPath(c)}/recensione`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, color: { dark: "#0f5e6e" } });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-muted-foreground">Stampa in A4 e mettilo al bancone o in barca.</p>
        <PrintButton />
      </div>
      {/* The sheet: sized for A4 when printed. */}
      <section className="mx-auto flex aspect-[210/297] max-w-[560px] flex-col items-center justify-between rounded-2xl border bg-background p-10 text-center print:max-w-none print:rounded-none print:border-0">
        <div>
          <p className="font-heading text-2xl font-bold text-primary">DiveAdvisor</p>
          <h1 className="mt-6 text-4xl font-bold leading-tight">Com&apos;è andata l&apos;immersione?</h1>
          <p className="mt-3 text-lg text-muted-foreground">Lascia una recensione verificata a {c.name}</p>
        </div>
        <div className="w-60 max-w-full" role="img" aria-label={`QR code per recensire ${c.name}`} dangerouslySetInnerHTML={{ __html: qr }} />
        <div className="space-y-2">
          <p className="text-lg font-semibold">Chiedi la tua card allo staff</p>
          <p className="text-sm text-muted-foreground">Inquadra il QR sulla card: la tua recensione è verificata e pubblicata subito. Senza card puoi usare il QR qui sopra.</p>
        </div>
      </section>
    </main>
  );
}
