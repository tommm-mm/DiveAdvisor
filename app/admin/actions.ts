"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { centerPath } from "@/lib/centers";
import { geocode } from "@/lib/geocode";
import { resolvePlace, type PlaceGuess } from "@/lib/maps-link";
import { BUSINESS_TYPE_LABELS, DIVE_TYPE_LABELS, FEDERATIONS, LANGUAGE_LABELS, LEVELS, SERVICE_LABELS, SPECIALTY_LABELS, slugify } from "@/lib/labels";
import { MAX_PHOTOS, PHOTO_BUCKET } from "@/lib/photos";
import { REGIONS } from "@/lib/regions";
import { parseVideo } from "@/lib/videos";

// Team-only actions behind /admin. Every action re-checks the admin login, then writes with the
// service role (team listings are not owned by anyone, so RLS would refuse them).

const optional = (max: number) => z.string().trim().max(max, `Massimo ${max} caratteri`).transform((v) => v || null);
const oneOf = (allowed: string[]) => z.array(z.string()).transform((vs) => vs.filter((v) => allowed.includes(v)));
const coord = (min: number, max: number) =>
  z.string().trim().transform((v) => (v ? Number(v.replace(",", ".")) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), "Coordinata non valida");

const price = z.string().trim().transform((v) => (v ? Number(v.replace(/[€\s]/g, "").replace(",", ".")) : null))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 10000), "Prezzo non valido");
const PRICE_KEYS = ["price_dive", "price_pack", "price_rental", "price_course_ow", "price_course_aow"] as const;

const schema = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  name: z.string().trim().min(2, "Indica il nome").max(200),
  region: z.enum(REGIONS, { error: "Scegli la regione" }),
  city: z.string().trim().min(2, "Indica la città").max(100),
  province: optional(60),
  address: optional(200),
  lat: coord(35, 48),
  lng: coord(6, 19),
  description: optional(1500),
  phone: optional(40),
  whatsapp: optional(40),
  email: z.union([z.literal(""), z.email("Email non valida")]).transform((v) => v || null),
  website: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Il sito deve iniziare con https://" })]).transform((v) => v || null),
  instagram: optional(100),
  season: optional(100),
  business_types: oneOf(Object.keys(BUSINESS_TYPE_LABELS)).refine((v) => v.length > 0, "Scegli almeno un tipo"),
  federations: oneOf(FEDERATIONS),
  dive_types: oneOf(Object.keys(DIVE_TYPE_LABELS)),
  services: oneOf(Object.keys(SERVICE_LABELS)),
  languages: oneOf(Object.keys(LANGUAGE_LABELS)),
  video_urls: z.array(z.string().trim()).max(3)
    .transform((vs) => vs.filter(Boolean))
    .refine((vs) => vs.every((v) => parseVideo(v)), "Usa un link YouTube o Instagram")
    .transform((vs) => vs.map((v) => parseVideo(v)!.url)),
  levels: oneOf(LEVELS.map((l) => l.value)),
  specialties: oneOf(Object.keys(SPECIALTY_LABELS)),
  price_dive: price, price_pack: price, price_rental: price, price_course_ow: price, price_course_aow: price,
  price_pack_dives: z.string().trim().transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 2 && v <= 100), "Da 2 a 100"),
  prices_source: z.enum(["", "sito", "diving"]).transform((v) => v || null),
});

export type SaveResult =
  | { ok: true; id: string; slug: string; url: string; created: boolean }
  | { ok: false; message?: string; fieldErrors?: Record<string, string> };

function refresh(c: { slug: string; region: string }) {
  revalidatePath(centerPath(c));
  revalidatePath("/");
  revalidatePath("/diving", "layout");
  revalidatePath("/admin", "layout");
}

async function uniqueSlug(db: ReturnType<typeof createAdminClient>, base: string) {
  const { data } = await db.from("dive_centers").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export async function saveCenter(form: FormData): Promise<SaveResult> {
  await requireAdmin();
  const text = (k: string) => String(form.get(k) ?? "");
  const lists = (k: string) => form.getAll(k).map(String);
  const parsed = schema.safeParse({
    id: text("id"), name: text("name"), region: text("region"), city: text("city"), province: text("province"),
    address: text("address"), lat: text("lat"), lng: text("lng"), description: text("description"),
    phone: text("phone"), whatsapp: text("whatsapp"), email: text("email").trim(), website: text("website").trim(),
    instagram: text("instagram"), season: text("season"),
    business_types: lists("business_types"), federations: lists("federations"), dive_types: lists("dive_types"),
    services: lists("services"), languages: lists("languages"), video_urls: lists("video_urls"),
    levels: lists("levels"), specialties: lists("specialties"),
    price_dive: text("price_dive"), price_pack: text("price_pack"), price_rental: text("price_rental"),
    price_course_ow: text("price_course_ow"), price_course_aow: text("price_course_aow"),
    price_pack_dives: text("price_pack_dives"), prices_source: text("prices_source"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, fieldErrors, message: "Controlla i campi evidenziati." };
  }
  const { id, ...fields } = parsed.data;
  // No pin given: try the address, then the town, so the listing still shows on the map.
  if (fields.lat === null || fields.lng === null) {
    const hit = (fields.address && await geocode(`${fields.address}, ${fields.city}`)) || await geocode(`${fields.city}, ${fields.region}`);
    if (hit) { fields.lat = hit.lat; fields.lng = hit.lng; }
  }
  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  // Prices carry the date they were last changed, so the page can say how fresh they are.
  let prices_updated_at: string | null | undefined = PRICE_KEYS.some((k) => fields[k] !== null) ? today : null;

  if (id) {
    // Claimed listings belong to their owner: the team does not overwrite them.
    const { data: current } = await db.from("dive_centers")
      .select("owner_id, prices_updated_at, price_pack_dives, price_dive, price_pack, price_rental, price_course_ow, price_course_aow").eq("id", id).maybeSingle();
    if (!current) return { ok: false, message: "Scheda non trovata." };
    if (current.owner_id) return { ok: false, message: "Questa scheda è gestita dal suo proprietario: non si modifica da qui." };
    const unchanged = PRICE_KEYS.every((k) => (current[k] === null ? null : Number(current[k])) === fields[k])
      && current.price_pack_dives === fields.price_pack_dives;
    if (unchanged) prices_updated_at = current.prices_updated_at;
    const { data, error } = await db.from("dive_centers")
      .update({ ...fields, prices_updated_at, verified_at: today })
      .eq("id", id).select("id, slug, region").single();
    if (error || !data) return { ok: false, message: "Salvataggio non riuscito. Riprova." };
    refresh(data);
    return { ok: true, id: data.id, slug: data.slug, url: centerPath(data), created: false };
  }

  const slug = await uniqueSlug(db, slugify(`${fields.name} ${fields.city}`).slice(0, 80));
  const { data, error } = await db.from("dive_centers")
    .insert({ ...fields, slug, prices_updated_at, source: "manual", verified_at: today })
    .select("id, slug, region").single();
  if (error || !data) return { ok: false, message: "Salvataggio non riuscito. Riprova." };
  refresh(data);
  return { ok: true, id: data.id, slug: data.slug, url: centerPath(data), created: true };
}

export async function lookupMapsLink(link: string): Promise<PlaceGuess | null> {
  await requireAdmin();
  if (typeof link !== "string" || link.length > 2000) return null;
  return resolvePlace(link);
}

// Possible duplicates while typing a new listing: similar name anywhere, or same town.
export async function findSimilar(name: string, city: string) {
  await requireAdmin();
  const words = slugify(String(name)).split("-").filter((w) => w.length > 3 && !["diving", "center", "centro", "club", "scuola"].includes(w));
  if (!words.length) return [];
  const db = createAdminClient();
  const { data } = await db.from("dive_centers").select("id, name, city, region")
    .or(words.slice(0, 3).map((w) => `slug.ilike.%${w}%`).join(",")).limit(5);
  const c = String(city).trim().toLowerCase();
  return (data ?? []).sort((a, b) => Number((b.city ?? "").toLowerCase() === c) - Number((a.city ?? "").toLowerCase() === c));
}

export async function setHidden(id: string, hidden: boolean) {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return;
  const db = createAdminClient();
  const { data } = await db.from("dive_centers").update({ hidden: !!hidden }).eq("id", id).select("slug, region").single();
  if (data) refresh(data);
}

// Photos: the browser uploads straight to Storage with a one-time signed URL (no 4.5 MB server limit),
// then registers the file here.
export async function photoUploadUrl(centerId: string) {
  await requireAdmin();
  if (!z.uuid().safeParse(centerId).success) return null;
  const path = `${centerId}/${crypto.randomUUID()}.webp`;
  const { data } = await createAdminClient().storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
  return data ? { path, token: data.token } : null;
}

export async function addPhoto(centerId: string, path: string) {
  await requireAdmin();
  if (!z.uuid().safeParse(centerId).success || !path.startsWith(`${centerId}/`)) return null;
  const db = createAdminClient();
  const { data: center } = await db.from("dive_centers").select("name, slug, region, center_photos(position)").eq("id", centerId).single();
  if (!center) return null;
  const positions = (center.center_photos ?? []).map((p) => p.position);
  if (positions.length >= MAX_PHOTOS) {
    await db.storage.from(PHOTO_BUCKET).remove([path]);
    return null;
  }
  const { data, error } = await db.from("center_photos")
    .insert({ center_id: centerId, path, position: positions.length ? Math.max(...positions) + 1 : 0, alt: center.name.slice(0, 150) })
    .select("id, path, position").single();
  if (error) {
    await db.storage.from(PHOTO_BUCKET).remove([path]);
    return null;
  }
  refresh(center);
  return data;
}

export async function removePhoto(photoId: string) {
  await requireAdmin();
  if (!z.uuid().safeParse(photoId).success) return false;
  const db = createAdminClient();
  const { data } = await db.from("center_photos").delete().eq("id", photoId).select("path, dive_centers(slug, region)").single();
  if (!data) return false;
  await db.storage.from(PHOTO_BUCKET).remove([data.path]);
  refresh(data.dive_centers as unknown as { slug: string; region: string });
  return true;
}

// New order of all photos of a centre (first = cover).
export async function reorderPhotos(centerId: string, ids: string[]) {
  await requireAdmin();
  if (!z.uuid().safeParse(centerId).success || !z.array(z.uuid()).max(MAX_PHOTOS).safeParse(ids).success) return false;
  const db = createAdminClient();
  const results = await Promise.all(ids.map((id, position) =>
    db.from("center_photos").update({ position }).eq("id", id).eq("center_id", centerId)));
  const { data } = await db.from("dive_centers").select("slug, region").eq("id", centerId).single();
  if (data) refresh(data);
  return results.every((r) => !r.error);
}

// Suggestions from /aggiungi-attivita: approving creates the listing (DB trigger), then opens it here.
export async function reviewSuggestion(id: string, status: "approved" | "rejected") {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success || !["approved", "rejected"].includes(status)) return { ok: false as const };
  const db = createAdminClient();
  const { data, error } = await db.from("business_suggestions").update({ status }).eq("id", id).select("center_id").single();
  revalidatePath("/admin", "layout");
  if (error) return { ok: false as const, message: error.message.includes("region") ? "Manca la regione: aggiungila in Supabase." : "Non riuscito. Riprova." };
  if (data?.center_id) revalidatePath("/diving", "layout");
  return { ok: true as const, centerId: data?.center_id ?? null };
}
