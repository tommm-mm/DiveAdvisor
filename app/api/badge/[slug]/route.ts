import { createPublicClient } from "@/lib/supabase/public";

// Review badge centres embed on their own site (an <img> inside a link to their listing).
// Plain SVG, cached for an hour; only public data (name and published rating).
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = createPublicClient();
  const { data: c } = await db.from("dive_centers").select("id").eq("slug", slug).maybeSingle();
  if (!c) return new Response("Not found", { status: 404 });
  const { data: r } = await db.from("center_ratings").select("avg_overall, review_count").eq("center_id", c.id).maybeSingle();

  const line = r?.review_count
    ? `${Number(r.avg_overall).toLocaleString("it-IT", { minimumFractionDigits: 1 })} su 5 · ${r.review_count} recensioni`
    : "Recensioni verificate";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="64" viewBox="0 0 220 64" role="img" aria-label="DiveAdvisor: ${esc(line)}">
  <rect width="220" height="64" rx="12" fill="#0f5e6e"/>
  <text x="16" y="27" font-family="Georgia, serif" font-size="16" font-weight="700" fill="#ffffff">DiveAdvisor</text>
  <text x="16" y="47" font-family="Arial, sans-serif" font-size="13" fill="#e6f0f2">${esc(line)}</text>
</svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
