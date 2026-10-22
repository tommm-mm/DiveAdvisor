import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { centerPath } from "@/lib/centers";
import { ClaimForm } from "./claim-form";

export const metadata: Metadata = { title: "Rivendica la scheda", robots: { index: false } };

type Props = { params: Promise<{ slug: string }> };

export default async function ClaimPage({ params }: Props) {
  const { slug } = await params;
  const user = await requireUser(`/rivendica/${slug}`);
  const supabase = await createClient();
  const { data: center } = await supabase
    .from("dive_centers").select("id, slug, name, region, owner_id").eq("slug", slug).maybeSingle();
  if (!center) notFound();

  const { data: pending } = await supabase
    .from("claim_requests").select("id").eq("center_id", center.id).eq("user_id", user.id).eq("status", "pending").maybeSingle();

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Rivendica la scheda</h1>
      <p className="mt-1 text-muted-foreground">
        <Link href={centerPath(center)} className="hover:text-primary">{center.name}</Link>
      </p>
      <div className="mt-6">
        {center.owner_id === user.id ? (
          <p>Questa scheda è già tua. <Link href="/dashboard" className="text-primary underline-offset-4 hover:underline">Vai all&apos;area diving</Link></p>
        ) : center.owner_id ? (
          <p className="text-muted-foreground">Questa scheda ha già un titolare. Se pensi sia un errore, scrivici.</p>
        ) : pending ? (
          <p className="text-muted-foreground">Hai già una richiesta in attesa per questa scheda. Ti scriveremo appena verificata.</p>
        ) : (
          <ClaimForm centerId={center.id} />
        )}
      </div>
    </main>
  );
}
