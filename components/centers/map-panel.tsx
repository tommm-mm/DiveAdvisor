"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapCenter } from "@/components/centers/centers-map";

const CentersMap = dynamic(() => import("@/components/centers/centers-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

const DESKTOP = "(min-width: 1024px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

// On mobile the map is hidden behind a toggle; from lg up it is always visible.
export function MapPanel({ centers, desktopHeight = "lg:h-[calc(100vh-8rem)]" }: { centers: MapCenter[]; desktopHeight?: string }) {
  const [open, setOpen] = useState(false);
  // Only mount Leaflet when the map is actually visible (saves the tile download on mobile).
  const isDesktop = useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => false);
  return (
    <div>
      <Button variant="outline" className="w-full lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Nascondi mappa" : "Mostra mappa"}
      </Button>
      <div className={`${open ? "block" : "hidden"} mt-3 h-80 lg:mt-0 lg:block ${desktopHeight}`}>
        {(open || isDesktop) && (
          <CentersMap centers={centers} />
        )}
      </div>
    </div>
  );
}
