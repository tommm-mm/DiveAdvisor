import { createPublicClient } from "@/lib/supabase/public";
import { slugify } from "@/lib/labels";

export type Center = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  region: string;
  province: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  federations: string[];
  dive_types: string[];
  services: string[];
  languages: string[];
  season: string | null;
  status: string;
  verified_at: string | null;
  video_urls: string[];
  business_types: string[];
  levels: string[];
  specialties: string[];
  price_dive: number | null;
  price_pack: number | null;
  price_pack_dives: number | null;
  price_rental: number | null;
  price_course_ow: number | null;
  price_course_aow: number | null;
  prices_source: string | null;
  prices_updated_at: string | null;
  center_photos: { path: string; position: number; alt: string | null }[];
};

export type CenterFilters = {
  regione?: string; // region slug
  q?: string; // free text on the centre name
  attivita: string[]; // business types
  tipo: string[];
  federazione: string[];
  lingua: string[];
  servizio: string[];
  livello?: string; // diver's level: centres that dive to it
  specialita: string[]; // all must match (a diver wants CCR *and* wrecks)
  prezzo?: number; // max price of a single dive
};

export type FilterOptions = {
  regions: { name: string; slug: string }[];
  businessTypes: string[];
  diveTypes: string[];
  federations: string[];
  languages: string[];
  services: string[];
  levels: string[];
  specialties: string[];
};

const LIST_COLUMNS =
  "id, slug, name, description, region, province, city, address, lat, lng, phone, whatsapp, email, website, instagram, federations, dive_types, services, languages, season, status, verified_at, video_urls, business_types, levels, specialties, price_dive, price_pack, price_pack_dives, price_rental, price_course_ow, price_course_aow, prices_source, prices_updated_at, center_photos(path, position, alt)";

export const regionSlug = (region: string) => slugify(region);
export const centerPath = (c: Pick<Center, "region" | "slug">) => `/diving/${regionSlug(c.region)}/${c.slug}`;

// Reads ?regione=…&tipo=a&tipo=b… into typed filters.
export function parseFilters(params: Record<string, string | string[] | undefined>): CenterFilters {
  const arr = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]).filter(Boolean);
  const regione = arr(params.regione)[0];
  const q = arr(params.q)[0]?.trim().slice(0, 80) || undefined;
  return {
    regione,
    q,
    attivita: arr(params.attivita),
    tipo: arr(params.tipo),
    federazione: arr(params.federazione),
    lingua: arr(params.lingua),
    servizio: arr(params.servizio),
    livello: arr(params.livello)[0],
    specialita: arr(params.specialita),
    prezzo: Number(arr(params.prezzo)[0]) > 0 ? Number(arr(params.prezzo)[0]) : undefined,
  };
}

// Region names from the data, used to resolve URL slugs and build the region filter.
export async function listRegions() {
  const { data, error } = await createPublicClient().from("dive_centers").select("region");
  if (error) throw error;
  const names = [...new Set(data.map((r) => r.region as string))].sort((a, b) => a.localeCompare(b, "it"));
  return names.map((name) => ({ name, slug: regionSlug(name) }));
}

export async function regionFromSlug(slug: string) {
  return (await listRegions()).find((r) => r.slug === slug) ?? null;
}

// Within one filter group values are OR-ed (overlaps); groups are AND-ed.
export async function listCenters(filters: CenterFilters): Promise<Center[]> {
  let query = createPublicClient().from("dive_centers").select(LIST_COLUMNS).order("name");
  if (filters.regione) {
    const region = await regionFromSlug(filters.regione);
    if (!region) return [];
    query = query.eq("region", region.name);
  }
  // Escape LIKE wildcards so user input is matched literally.
  if (filters.q) query = query.ilike("name", `%${filters.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`);
  if (filters.attivita.length) query = query.overlaps("business_types", filters.attivita);
  if (filters.tipo.length) query = query.overlaps("dive_types", filters.tipo);
  if (filters.federazione.length) query = query.overlaps("federations", filters.federazione);
  if (filters.lingua.length) query = query.overlaps("languages", filters.lingua);
  if (filters.servizio.length) query = query.overlaps("services", filters.servizio);
  if (filters.livello) query = query.contains("levels", [filters.livello]);
  if (filters.specialita.length) query = query.contains("specialties", filters.specialita);
  if (filters.prezzo) query = query.lte("price_dive", filters.prezzo);
  const { data, error } = await query;
  if (error) throw error;
  return data as Center[];
}

// Filter options are derived from the data, so they never list values with zero centres.
export async function getFilterOptions(): Promise<FilterOptions> {
  const { data, error } = await createPublicClient()
    .from("dive_centers")
    .select("region, business_types, dive_types, federations, languages, services, levels, specialties");
  if (error) throw error;
  const uniq = (key: "business_types" | "dive_types" | "federations" | "languages" | "services" | "levels" | "specialties") =>
    [...new Set(data.flatMap((r) => r[key] as string[]))].sort();
  const regions = [...new Set(data.map((r) => r.region as string))]
    .sort((a, b) => a.localeCompare(b, "it"))
    .map((name) => ({ name, slug: regionSlug(name) }));
  return {
    regions,
    businessTypes: uniq("business_types"),
    diveTypes: uniq("dive_types"),
    federations: uniq("federations"),
    languages: uniq("languages"),
    services: uniq("services"),
    levels: uniq("levels"),
    specialties: uniq("specialties"),
  };
}

export async function getCenter(regionSlugParam: string, slug: string): Promise<Center | null> {
  const { data, error } = await createPublicClient()
    .from("dive_centers").select(LIST_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data || regionSlug(data.region) !== regionSlugParam) return null;
  return data as Center;
}

// Regions with their number of centres, most centres first (home page tiles).
export async function listRegionCounts() {
  const { data, error } = await createPublicClient().from("dive_centers").select("region");
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const r of data) counts.set(r.region as string, (counts.get(r.region as string) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, slug: regionSlug(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "it"));
}

// Test listings ("[TEST] …") stay out of search engines until real data replaces them.
export const isTestCenter = (c: Pick<Center, "name">) => c.name.startsWith("[TEST]");

// Photos ordered for display; position 0 is the cover.
export const sortedPhotos = (c: Pick<Center, "center_photos">) => [...(c.center_photos ?? [])].sort((a, b) => a.position - b.position);
