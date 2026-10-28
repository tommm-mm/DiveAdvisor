import { createAdminClient } from "@/lib/supabase/admin";
import { AdminList, type AdminCenter } from "@/components/admin/admin-list";
import { SuggestionsInbox } from "@/components/admin/suggestions-inbox";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const db = createAdminClient();
  const [{ data: centers }, { data: suggestions }] = await Promise.all([
    db.from("dive_centers")
      .select("id, name, city, region, hidden, owner_id, phone, email, website, description, lat, business_types, created_at, center_photos(path, position)")
      .order("created_at", { ascending: false }),
    db.from("business_suggestions")
      .select("id, name, city, region, business_types, contact_email, phone, website, source, created_at")
      .eq("status", "pending").order("created_at"),
  ]);
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {!!suggestions?.length && <SuggestionsInbox items={suggestions} />}
      <AdminList centers={(centers ?? []) as AdminCenter[]} />
    </main>
  );
}
