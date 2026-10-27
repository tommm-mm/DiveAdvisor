import "server-only";

// Best-effort coordinates for a new listing (OpenStreetMap Nominatim, one request, 5 s timeout).
// Returns null rather than failing: a listing without a map pin is still useful and can be fixed later.
export async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "DiveAdvisor/1.0 (+https://dive-advisor.vercel.app)" },
      signal: AbortSignal.timeout(5000),
    });
    const hit = res.ok ? ((await res.json()) as { lat: string; lon: string }[])[0] : undefined;
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}
