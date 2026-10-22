"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { centerPath, type Center } from "@/lib/centers";

export type MapCenter = Pick<Center, "id" | "slug" | "name" | "region" | "city" | "lat" | "lng">;

// Leaflet touches `window`, so this file is only loaded in the browser (see map-panel.tsx).
export default function CentersMap({ centers }: { centers: MapCenter[] }) {
  const points = centers.filter((c) => c.lat !== null && c.lng !== null);
  const bounds = points.length
    ? (points.map((c) => [c.lat!, c.lng!]) as [number, number][])
    : undefined;
  return (
    <MapContainer
      // Remount when the result set changes so the map refits its bounds.
      key={points.map((c) => c.id).join(",")}
      bounds={bounds}
      boundsOptions={{ padding: [30, 30], maxZoom: 11 }}
      center={bounds ? undefined : [44.5, 10]}
      zoom={bounds ? undefined : 6}
      className="h-full w-full rounded-lg"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((c) => (
        <CircleMarker
          key={c.id}
          center={[c.lat!, c.lng!]}
          radius={8}
          pathOptions={{ color: "#0e6a8a", fillColor: "#1689b0", fillOpacity: 0.85, weight: 2 }}
        >
          <Popup>
            <strong>{c.name}</strong>
            <br />
            {c.city}
            <br />
            <Link href={centerPath(c)}>Vedi scheda</Link>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
