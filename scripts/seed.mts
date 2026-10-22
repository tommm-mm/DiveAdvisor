// Reads data/diving.csv, validates every row and prints an error report.
// Usage: npm run seed            -> validate only (dry run)
//        npm run seed -- --write -> also upsert into Supabase (needs SUPABASE_SERVICE_ROLE_KEY)
//        npm run seed -- --sql   -> print an idempotent upsert SQL statement (for the Supabase SQL editor)
import { readFileSync } from "node:fs";

const REQUIRED = ["nome", "regione", "citta", "lat", "lng", "fonte", "data_verifica"];

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
const slugs = new Set<string>();
const centers = lines.map((cols, i) => {
  const r = Object.fromEntries(header.map((h, j) => [h.trim(), (cols[j] ?? "").trim()]));
  const line = i + 2;
  for (const f of REQUIRED) if (!r[f]) errors.push(`line ${line}: missing "${f}"`);
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
  return {
    slug, name: r.nome, description: r.descrizione || null, region: r.regione, province: r.provincia || null, city: r.citta,
    address: r.indirizzo || null, lat, lng, phone: r.telefono || null, whatsapp: r.whatsapp || null,
    email: r.email || null, website: r.sito || null, instagram: r.instagram || null,
    federations: list("federazioni").map((v) => v.toUpperCase()), dive_types: list("tipi_immersione"),
    services: list("servizi"), languages: list("lingue"), verified_at: r.data_verifica || null,
    source: "manual" as const,
  };
});

console.log(`Rows: ${centers.length} | Errors: ${errors.length}`);
errors.forEach((e) => console.log("  - " + e));
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
    `on conflict (slug) do update set ${updates}, updated_at = now();`);
}

if (process.argv.includes("--write")) {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  const { error } = await createClient(url, key).from("dive_centers").upsert(centers, { onConflict: "slug" });
  if (error) throw error;
  console.log(`Upserted ${centers.length} centers.`);
}
