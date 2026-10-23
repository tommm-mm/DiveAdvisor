import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { centerPath, getCenter } from "@/lib/centers";
import { createClient } from "@/lib/supabase/server";
import { turnstileSiteKey } from "@/lib/turnstile";
import { ReviewForm } from "@/components/reviews/review-form";

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

  const path = `${centerPath(c)}/recensione${codice ? `?codice=${encodeURIComponent(codice)}` : ""}`;
  const user = await requireUser(path);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("reviews").select("status").eq("center_id", c.id).eq("user_id", user.id).maybeSingle();

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <nav aria-label="Percorso" className="text-sm text-muted-foreground">
        <Link href={centerPath(c)} className="hover:text-primary">{c.name}</Link>
      </nav>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Recensisci {c.name}</h1>
      {existing ? (
        <div role="status" className="mt-6 rounded-lg bg-muted p-4">
          <p className="font-medium">Hai già recensito questo diving</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {existing.status === "pending" ? "La tua recensione è in attesa di moderazione." : "Puoi scrivere una sola recensione per diving."}
          </p>
          <Link href={centerPath(c)} className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">Torna alla scheda</Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Valuta la tua immersione su sei criteri. Con il codice ricevuto dal diving la recensione è verificata e pubblicata subito.
          </p>
          <div className="mt-6">
            <ReviewForm centerId={c.id} centerUrl={centerPath(c)} siteKey={turnstileSiteKey()} initialCode={codice ?? ""} />
          </div>
        </>
      )}
    </main>
  );
}
