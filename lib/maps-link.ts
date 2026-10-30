import "server-only";
import { REGIONS } from "@/lib/regions";

export type PlaceGuess = {
  name?: string; lat?: number; lng?: number;
  address?: string; city?: string; province?: string; region?: (typeof REGIONS)[number];
};

const UA = { "User-Agent": "DiveAdvisor/1.0 (+https://dive-advisor.vercel.app)" };

// Name and coordinates from a Google Maps URL. Coordinates of the place itself (!3d…!4d…) win over
// the map centre (@lat,lng), which can be off when the user had panned.
export function parseMapsUrl(raw: string): PlaceGuess {
  const url = decodeURIComponent(raw.replace(/\+/g, " "));
  const out: PlaceGuess = {};
  const place = url.match(/\/place\/([^/@?]+)/);
  if (place) out.name = place[1].trim();
  const pin = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
    ?? url.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
    ?? url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (pin) { out.lat = Number(pin[1]); out.lng = Number(pin[2]); }
  return out;
}

const isGoogleMaps = (u: URL) =>
  /(^|\.)google\.[a-z.]+$/.test(u.hostname) || u.hostname === "maps.app.goo.gl" || u.hostname === "goo.gl";

// Short share links (maps.app.goo.gl) redirect to the full URL: follow at most 5 hops, only to Google hosts.
async function expand(url: string) {
  let current = url;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(current, { redirect: "manual", headers: UA, signal: AbortSignal.timeout(5000) });
    const next = res.headers.get("location");
    if (!next) break;
    const target = new URL(next, current);
    if (target.protocol !== "https:" || !isGoogleMaps(target)) break;
    current = target.toString();
  }
  return current;
}

// Nominatim reverse geocoding: street address, town, province and region from coordinates.
async function reverse(lat: number, lng: number): Promise<PlaceGuess> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&accept-language=it&lat=${lat}&lon=${lng}`,
      { headers: UA, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    const a = ((await res.json()) as { address?: Record<string, string> }).address ?? {};
    const street = [a.road ?? a.pedestrian ?? a.square, a.house_number].filter(Boolean).join(" ");
    const state = (a.state ?? "").toLowerCase();
    return {
      address: street || undefined,
      city: a.city ?? a.town ?? a.village ?? a.municipality,
      province: a.county?.replace(/^(Provincia|Città metropolitana) d(i|el|ella|')\s*/i, ""),
      region: REGIONS.find((r) => state.startsWith(r.toLowerCase())),
    };
  } catch {
    return {};
  }
}

export async function resolvePlace(link: string): Promise<PlaceGuess | null> {
  let u: URL;
  try { u = new URL(link.trim()); } catch { return null; }
  if (u.protocol !== "https:" || !isGoogleMaps(u)) return null;
  const full = u.hostname.endsWith("goo.gl") ? await expand(u.toString()).catch(() => u.toString()) : u.toString();
  const guess = parseMapsUrl(full);
  if (guess.lat == null || guess.lng == null) return guess.name ? guess : null;
  return { ...(await reverse(guess.lat, guess.lng)), ...guess };
}
