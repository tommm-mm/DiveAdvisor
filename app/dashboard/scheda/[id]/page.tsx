import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { centerPath } from "@/lib/centers";
import { EditCenterForm } from "@/components/dashboard/edit-center-form";
import { PhotoManager } from "@/components/dashboard/photo-manager";

export const metadata: Metadata = { title: "Modifica scheda", robots: { index: false } };

export default async function EditCenterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/scheda/${id}`);
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("dive_centers")
    .select("id, slug, name, region, owner_id, description, address, phone, whatsapp, email, website, instagram, season, business_types, federations, dive_types, services, languages, video_urls, levels, specialties, price_dive, price_pack, price_pack_dives, price_rental, price_course_ow, price_course_aow, center_photos(id, path, position)")
    .eq("id", id).maybeSingle();
  if (!c || c.owner_id !== user.id) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <nav aria-label="Percorso" className="text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary">Area diving</Link>
      </nav>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Modifica {c.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Nome e città si cambiano scrivendoci. <Link href={centerPath(c)} className="text-primary underline-offset-4 hover:underline">Vedi la scheda pubblica</Link>
      </p>
      <div className="mt-6"><PhotoManager centerId={c.id} centerName={c.name} initial={c.center_photos ?? []} /></div>
      <div className="mt-8 border-t pt-6"><EditCenterForm center={c} /></div>
    </main>
  );
}
