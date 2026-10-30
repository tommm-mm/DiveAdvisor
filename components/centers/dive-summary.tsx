import { SPECIALTY_LABELS, euro, label, maxDepth } from "@/lib/labels";
import type { Center } from "@/lib/centers";

// Divers know these by their acronym or short name.
const SHORT: Record<string, string> = { ccr: "CCR", dpv: "Scooter" };

// One line a diver scans first: how deep, what kit, from how much ("Fino a 60 m · CCR · da 45 €").
export function DiveSummary({ center, className = "" }: { center: Pick<Center, "levels" | "specialties" | "price_dive">; className?: string }) {
  const parts = [
    maxDepth(center.levels),
    ...center.specialties.slice(0, 3).map((s) => SHORT[s] ?? label(SPECIALTY_LABELS, s)),
    center.specialties.length > 3 && `+${center.specialties.length - 3}`,
    center.price_dive != null && `da ${euro(center.price_dive)}`,
  ].filter(Boolean);
  if (!parts.length) return null;
  return <p className={`text-sm font-medium ${className}`}>{parts.join(" · ")}</p>;
}
