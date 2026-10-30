import { notFound } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { centerPath } from "@/lib/centers";
import { CenterEditor, type EditorCenter } from "@/components/admin/center-editor";

export const dynamic = "force-dynamic";

export default async function EditCenterAdminPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ nuova?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { data } = await createAdminClient().from("dive_centers")
    .select("id, slug, name, region, city, province, address, lat, lng, description, phone, whatsapp, email, website, instagram, season, business_types, federations, dive_types, services, languages, video_urls, hidden, owner_id, center_photos(id, path, position)")
    .eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* key: a fresh editor per listing, so state never leaks between pages */}
      <CenterEditor key={data.id} center={data as EditorCenter} publicUrl={centerPath(data)} justCreated={(await searchParams).nuova === "1"} />
    </main>
  );
}
