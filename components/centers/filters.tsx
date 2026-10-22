"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DIVE_TYPE_LABELS, LANGUAGE_LABELS, SERVICE_LABELS, label } from "@/lib/labels";
import type { FilterOptions } from "@/lib/centers";

type Props = { options: FilterOptions; showRegion?: boolean };

// Filters only rewrite the URL; the server component re-renders with the new results.
export function Filters({ options, showRegion = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const push = (next: URLSearchParams) =>
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));

  const toggle = (key: string, value: string, checked: boolean) => {
    const next = new URLSearchParams(params);
    const values = next.getAll(key).filter((v) => v !== value);
    if (checked) values.push(value);
    next.delete(key);
    values.forEach((v) => next.append(key, v));
    push(next);
  };

  const setRegion = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set("regione", value); else next.delete("regione");
    push(next);
  };

  const groups = [
    { key: "tipo", title: "Tipo di immersione", values: options.diveTypes, map: DIVE_TYPE_LABELS },
    { key: "federazione", title: "Federazione", values: options.federations, map: {} },
    { key: "lingua", title: "Lingue parlate", values: options.languages, map: LANGUAGE_LABELS },
    { key: "servizio", title: "Servizi", values: options.services, map: SERVICE_LABELS },
  ];

  return (
    <div className="space-y-6" aria-busy={pending}>
      {showRegion && (
        <div className="space-y-2">
          <Label htmlFor="filter-region">Regione</Label>
          <select
            id="filter-region"
            className="h-9 w-full rounded-lg border bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            value={params.get("regione") ?? ""}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">Tutte le regioni</option>
            {options.regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
          </select>
        </div>
      )}
      {groups.map((g) => (
        <fieldset key={g.key} className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{g.title}</legend>
          {g.values.map((v) => {
            const id = `filter-${g.key}-${v}`;
            return (
              <div key={v} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={params.getAll(g.key).includes(v)}
                  onCheckedChange={(checked) => toggle(g.key, v, checked)}
                />
                <Label htmlFor={id} className="font-normal">{label(g.map, v)}</Label>
              </div>
            );
          })}
        </fieldset>
      ))}
      {params.size > 0 && (
        <Button variant="ghost" size="sm" onClick={() => push(new URLSearchParams())}>Azzera filtri</Button>
      )}
    </div>
  );
}
