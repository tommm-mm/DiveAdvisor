import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { centerPath, getCenter } from "@/lib/centers";
import { createClient } from "@/lib/supabase/server";
import { turnstileSiteKey } from "@/lib/turnstile";
import { ReviewForm } from "@/components/reviews/review-form";
import { formatDate } from "@/lib/review-utils";

type Props = {
  params: Promise<{ regione: string; slug: string }>;
  searchParams: Promise<{ codice?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { regione, slug } = await params;
  const c = await getCenter(regione, slug);
  return c ? { title: `Recensisci ${c.name}`, robots: { index: false } } : {};
}

export default async function ReviewPage({ params, searchParams }: Props) {
  const [{ regione, slug }, { codice }] = await Promise.all([params, searchParams]);
  const c = await getCenter(regione, slug);
  if (!c) notFound();

  // No login needed: visitors write first and confirm by email; logged-in users publish directly.
  const user = await getUser();
  let latest: { dive_date: string } | null = null;
  if (user) {
    // Divers may review again after a new dive; just remind them of their latest review.
    const supabase = await createClient();
    ({ data: latest } = await supabase
      .from("reviews").select("dive_date").eq("center_id", c.id).eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle());
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <nav aria-label="Percorso" className="text-sm text-muted-foreground">
        <Link href={centerPath(c)} className="hover:text-primary">{c.name}</Link>
      </nav>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Recensisci {c.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Valuta la tua immersione su sei criteri. Con il codice ricevuto dal diving la recensione è verificata e pubblicata subito.
      </p>
      {latest && (
        <p className="mt-3 rounded-lg bg-muted p-3 text-sm">
          Hai già recensito l&apos;immersione del {formatDate(latest.dive_date)}. Puoi scrivere un&apos;altra recensione per una nuova immersione.
        </p>
      )}
      <div className="mt-6">
        <ReviewForm centerId={c.id} centerUrl={centerPath(c)} siteKey={turnstileSiteKey()} initialCode={codice ?? ""} needsEmail={!user} />
      </div>
    </main>
  );
}
