// Reads data/diving.csv, validates every row and prints an error report.
// Usage: npm run seed            -> validate only (dry run)
//        npm run seed -- --write -> also upsert into Supabase (needs SUPABASE_SERVICE_ROLE_KEY)
//        npm run seed -- --sql   -> print an idempotent upsert SQL statement (for the Supabase SQL editor)
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const REQUIRED = ["nome", "regione", "citta", "fonte", "data_verifica"];

// Allowed values: keep in sync with the dropdowns of the data collection sheet and lib/labels.ts.
const REGIONS = ["Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna", "Friuli-Venezia Giulia", "Lazio", "Liguria",
  "Lombardia", "Marche", "Molise", "Piemonte", "Puglia", "Sardegna", "Sicilia", "Toscana", "Trentino-Alto Adige", "Umbria",
  "Valle d'Aosta", "Veneto"];
const ALLOWED: Record<string, string[]> = {
  tipo_attivita: ["diving", "scuola", "negozio"],
  federazioni: ["padi", "ssi", "cmas", "fipsas", "tdi", "sdi", "iantd", "gue", "naui", "raid", "uisp", "anis", "padi tecrec"],
  tipi_immersione: ["lago", "mare", "tecnico", "corsi"],
  servizi: ["noleggio", "corsi", "ricarica", "barca", "nitrox", "trimix"],
  lingue: ["it", "en", "de", "fr", "es"],
  // Optional columns: levels double as depth bands (ow 18 m … tech3 over 60 m).
  livelli: ["ow", "aow", "deep", "tech1", "tech2", "tech3"],
  specialita: ["nitrox", "trimix", "ccr", "sidemount", "dpv", "notturna", "relitti", "grotte"],
};
// Older sheets list nitrox/trimix under servizi: they are specialties now.
const MOVED_TO_SPECIALTIES = ["nitrox", "trimix"];

// Missing lat/lng are geocoded from the address with OpenStreetMap Nominatim (max 1 request/second,
// identified client, results cached in data/geocode-cache.json so re-runs don't query again).
const CACHE_FILE = "data/geocode-cache.json";
const cache: Record<string, [number, number] | null> = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, "utf8")) : {};
async function geocode(query: string): Promise<[number, number] | null> {
  if (query in cache) return cache[query];
  await new Promise((r) => setTimeout(r, 1100));
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": "DiveAdvisor-seed/1.0 (+https://dive-advisor.vercel.app)" } });
  const hit = res.ok ? ((await res.json()) as { lat: string; lon: string }[])[0] : undefined;
  cache[query] = hit ? [Number(hit.lat), Number(hit.lon)] : null;
  return cache[query];
}

// Minimal CSV parser that supports quoted fields with commas.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\[test\]/g, "test").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const [header, ...lines] = parseCsv(readFileSync("data/diving.csv", "utf8"));
const errors: string[] = [];
const warnings: string[] = [];
const slugs = new Set<string>();
const centers = [];
for (const [i, cols] of lines.entries()) {
  const r = Object.fromEntries(header.map((h, j) => [h.trim(), (cols[j] ?? "").trim()]));
  const line = i + 2;
  if (!r.nome && !r.citta) continue; // empty row in the sheet
  for (const f of REQUIRED) if (!r[f]) errors.push(`line ${line}: missing "${f}"`);
  if (r.regione && !REGIONS.includes(r.regione)) errors.push(`line ${line}: unknown region "${r.regione}"`);
  for (const [f, allowed] of Object.entries(ALLOWED)) {
    for (const v of (r[f] ?? "").split("|").map((x) => x.trim().toLowerCase()).filter(Boolean)) {
      if (!allowed.includes(v)) errors.push(`line ${line}: "${v}" is not an allowed value for ${f}`);
    }
  }
  if ((!r.lat || !r.lng) && r.citta) {
    const exact = r.indirizzo ? await geocode(`${r.indirizzo}, ${r.citta}`) : null;
    const point = exact ?? (await geocode(`${r.citta}, ${r.regione}`));
    if (point) {
      [r.lat, r.lng] = point.map(String);
      if (!exact) warnings.push(`line ${line}: address not found, using the centre of ${r.citta} (check the map pin)`);
    } else errors.push(`line ${line}: could not find "${r.citta}" on the map; add lat/lng by hand`);
  }
  const lat = Number(r.lat), lng = Number(r.lng);
  // Rough bounding box for Italy.
  if (r.lat && (isNaN(lat) || lat < 35 || lat > 48)) errors.push(`line ${line}: lat out of Italy (${r.lat})`);
  if (r.lng && (isNaN(lng) || lng < 6 || lng > 19)) errors.push(`line ${line}: lng out of Italy (${r.lng})`);
  if (r.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) errors.push(`line ${line}: invalid email`);
  if (r.sito && !/^https?:\/\//.test(r.sito)) errors.push(`line ${line}: website must start with http(s)://`);
  if (r.data_verifica && !/^\d{4}-\d{2}-\d{2}$/.test(r.data_verifica)) errors.push(`line ${line}: data_verifica must be YYYY-MM-DD`);
  const slug = slugify(`${r.nome} ${r.citta}`);
  if (slugs.has(slug)) errors.push(`line ${line}: duplicate (${slug})`);
  slugs.add(slug);
  const list = (f: string) => (r[f] ? r[f].split("|").map((v) => v.trim().toLowerCase()).filter(Boolean) : []);
  centers.push({
    slug, name: r.nome, description: r.descrizione || null, region: r.regione, province: r.provincia || null, city: r.citta,
    address: r.indirizzo || null, lat, lng, phone: r.telefono || null, whatsapp: r.whatsapp || null,
    email: r.email || null, website: r.sito || null, instagram: r.instagram || null,
    // Missing column or empty cell: a dive centre.
    business_types: list("tipo_attivita").length ? list("tipo_attivita") : ["diving"],
    federations: list("federazioni").map((v) => v.toUpperCase()), dive_types: list("tipi_immersione"),
    services: list("servizi").filter((v) => !MOVED_TO_SPECIALTIES.includes(v)),
    specialties: [...new Set([...list("specialita"), ...list("servizi").filter((v) => MOVED_TO_SPECIALTIES.includes(v))])],
    levels: list("livelli"), languages: list("lingue"), verified_at: r.data_verifica || null,
    source: "manual" as const,
  });
}
writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));

console.log(`Rows: ${centers.length} | Errors: ${errors.length} | Warnings: ${warnings.length}`);
errors.forEach((e) => console.log("  - " + e));
warnings.forEach((w) => console.log("  ! " + w));
if (errors.length) process.exit(1);

if (process.argv.includes("--sql")) {
  const lit = (v: unknown): string =>
    v === null ? "null"
    : Array.isArray(v) ? `'{${v.map((x) => `"${String(x).replace(/"/g, '\\"')}"`).join(",")}}'`
    : typeof v === "number" ? String(v)
    : `'${String(v).replace(/'/g, "''")}'`;
  const cols = Object.keys(centers[0]);
  const values = centers.map((c) => `  (${cols.map((k) => lit(c[k as keyof typeof c])).join(", ")})`);
  const updates = cols.filter((k) => k !== "slug").map((k) => `${k} = excluded.${k}`).join(", ");
  console.log(`insert into public.dive_centers (${cols.join(", ")}) values\n${values.join(",\n")}\n` +
    // Claimed listings belong to their owner now: a re-import must never overwrite their edits.
    `on conflict (slug) do update set ${updates}, updated_at = now()\nwhere dive_centers.owner_id is null;`);
}

if (process.argv.includes("--write")) {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  const db = createClient(url, key);
  // Claimed listings belong to their owner now: skip them so a re-import never overwrites their edits.
  const { data: claimed, error: readError } = await db.from("dive_centers").select("slug").not("owner_id", "is", null);
  if (readError) throw readError;
  const skip = new Set(claimed.map((c) => c.slug));
  const rows = centers.filter((c) => !skip.has(c.slug));
  const { error } = await db.from("dive_centers").upsert(rows, { onConflict: "slug" });
  if (error) throw error;
  console.log(`Upserted ${rows.length} centers (skipped ${centers.length - rows.length} claimed).`);
}
