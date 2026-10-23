import { ImageResponse } from "next/og";
import { getCenter, sortedPhotos } from "@/lib/centers";
import { photoUrl } from "@/lib/photos";
import { getRating } from "@/lib/reviews";

// Per-centre share image: centres share their own page, so the preview should name them.
export const alt = "Scheda del diving su DiveAdvisor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ regione: string; slug: string }> }) {
  const { regione, slug } = await params;
  const c = await getCenter(regione, slug);
  const rating = c ? await getRating(c.id) : null;
  const place = c ? [c.city, c.region].filter(Boolean).join(", ") : "";
  const cover = c ? sortedPhotos(c)[0] : undefined;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f6f2ea", color: "#13232b" }}>
      {/* With a cover photo: photo on the left, text on the right. */}
      {cover ? (
        <img src={photoUrl(cover.path)} alt="" width={480} height={630} style={{ width: 480, height: 630, objectFit: "cover" }} />
      ) : null}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72 }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: "#0f5e6e" }}>DiveAdvisor</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>{c?.name ?? "Diving"}</div>
          <div style={{ fontSize: 34, color: "#5d6b70" }}>{place}</div>
          {rating?.review_count ? (
            <div style={{ fontSize: 34, fontWeight: 700 }}>
              {Number(rating.avg_overall).toLocaleString("it-IT", { minimumFractionDigits: 1 })} su 5 · {rating.review_count} recensioni
            </div>
          ) : null}
        </div>
      </div>
      </div>
    ),
    size,
  );
}
