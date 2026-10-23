"use client";

import { useEffect } from "react";

// Reports one view per centre per browser tab. sessionStorage only dedupes; it is not a cookie
// and may be unavailable (private mode), in which case we simply count again.
export function ViewBeacon({ centerId }: { centerId: string }) {
  useEffect(() => {
    const key = `viewed:${centerId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    fetch("/api/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ centerId }), keepalive: true })
      .catch(() => {});
  }, [centerId]);
  return null;
}
