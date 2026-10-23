import { ImageResponse } from "next/og";

// Default share image (WhatsApp, Instagram, Facebook previews) in the AB style.
export const alt = "DiveAdvisor: trova e contatta i diving in Italia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0f5e6e", color: "#ffffff" }}>
        <div style={{ fontSize: 44, fontWeight: 700 }}>DiveAdvisor</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>Trova il diving giusto, in Italia</div>
          <div style={{ fontSize: 34, opacity: 0.9 }}>Recensioni verificate e contatto diretto, dai laghi al mare.</div>
        </div>
      </div>
    ),
    size,
  );
}
