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
};

export type CenterFilters = {
  regione?: string; // region slug
  tipo: string[];
  federazione: string[];
  lingua: string[];
  servizio: string[];
};

export type FilterOptions = {
  regions: { name: string; slug: string }[];
  diveTypes: string[];
  federations: string[];
  languages: string[];
  services: string[];
};

const LIST_COLUMNS =
  "id, slug, name, description, region, province, city, address, lat, lng, phone, whatsapp, email, website, instagram, federations, dive_types, services, languages, season, status, verified_at";

export const regionSlug = (region: string) => slugify(region);
export const centerPath = (c: Pick<Center, "region" | "slug">) => `/diving/${regionSlug(c.region)}/${c.slug}`;

// Reads ?regione=…&tipo=a&tipo=b… into typed filters.
export function parseFilters(params: Record<string, string | string[] | undefined>): CenterFilters {
  const arr = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]).filter(Boolean);
  const regione = arr(params.regione)[0];
  return {
    regione,
    tipo: arr(params.tipo),
    federazione: arr(params.federazione),
    lingua: arr(params.lingua),
    servizio: arr(params.servizio),
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
  if (filters.tipo.length) query = query.overlaps("dive_types", filters.tipo);
  if (filters.federazione.length) query = query.overlaps("federations", filters.federazione);
  if (filters.lingua.length) query = query.overlaps("languages", filters.lingua);
  if (filters.servizio.length) query = query.overlaps("services", filters.servizio);
  const { data, error } = await query;
  if (error) throw error;
  return data as Center[];
}

// Filter options are derived from the data, so they never list values with zero centres.
export async function getFilterOptions(): Promise<FilterOptions> {
  const { data, error } = await createPublicClient()
    .from("dive_centers")
    .select("region, dive_types, federations, languages, services");
  if (error) throw error;
  const uniq = (key: "dive_types" | "federations" | "languages" | "services") =>
    [...new Set(data.flatMap((r) => r[key] as string[]))].sort();
  const regions = [...new Set(data.map((r) => r.region as string))]
    .sort((a, b) => a.localeCompare(b, "it"))
    .map((name) => ({ name, slug: regionSlug(name) }));
  return {
    regions,
    diveTypes: uniq("dive_types"),
    federations: uniq("federations"),
    languages: uniq("languages"),
    services: uniq("services"),
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
