import { Badge } from "@/components/ui/badge";
import { DIVE_TYPE_LABELS, label } from "@/lib/labels";
import type { Center } from "@/lib/centers";

export function CenterBadges({ center }: { center: Pick<Center, "dive_types" | "federations"> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {center.dive_types.map((t) => (
        <Badge key={t} variant="secondary">{label(DIVE_TYPE_LABELS, t)}</Badge>
      ))}
      {center.federations.map((f) => (
        <Badge key={f} variant="outline">{f}</Badge>
      ))}
    </div>
  );
}
