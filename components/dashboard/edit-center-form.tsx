"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateCenter, type EditState } from "@/app/dashboard/scheda/[id]/actions";
import { BUSINESS_TYPE_LABELS, DIVE_TYPE_LABELS, FEDERATIONS, LANGUAGE_LABELS, SERVICE_LABELS } from "@/lib/labels";

type Center = {
  id: string; description: string | null; address: string | null; phone: string | null; whatsapp: string | null;
  email: string | null; website: string | null; instagram: string | null; season: string | null;
  business_types: string[]; federations: string[]; dive_types: string[]; services: string[]; languages: string[]; video_urls: string[];
};

const field = "w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

const TEXT_FIELDS = [
  { name: "phone", label: "Telefono", type: "tel" },
  { name: "whatsapp", label: "WhatsApp", type: "tel" },
  { name: "email", label: "Email", type: "email" },
  { name: "website", label: "Sito web", type: "url" },
  { name: "instagram", label: "Instagram", type: "text" },
  { name: "address", label: "Indirizzo", type: "text" },
  { name: "season", label: "Stagione (es. aprile–ottobre)", type: "text" },
] as const;

export function EditCenterForm({ center }: { center: Center }) {
  const [state, action, pending] = useActionState<EditState, FormData>(updateCenter, { status: "idle" });
  const err = state.fieldErrors ?? {};
  // After a submit, show what the owner typed (not the stale server copy).
  const text = (k: keyof Center) => (state.values?.[k] as string | undefined) ?? (center[k] as string | null) ?? "";
  const list = (k: keyof Center) => (state.values?.[k] as string[] | undefined) ?? (center[k] as string[]);

  const group = (name: keyof Pick<Center, "business_types" | "federations" | "dive_types" | "services" | "languages">, title: string, options: [string, string][]) => (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, text]) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/10">
            <input type="checkbox" name={name} value={value} defaultChecked={list(name).includes(value)} className="size-4 accent-primary" />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    // key remounts the fields after each submit so defaultValue/defaultChecked pick up the echoed values.
    <form key={JSON.stringify(state.values ?? null)} action={action} className="space-y-6" noValidate>
      <input type="hidden" name="id" value={center.id} />
      <div className="space-y-1.5">
        <Label htmlFor="e-description">Descrizione</Label>
        <textarea id="e-description" name="description" rows={5} maxLength={1500} defaultValue={text("description")}
          className={`${field} py-2`} aria-invalid={!!err.description} />
        {err.description && <p className="text-sm text-destructive">{err.description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map((f) => (
          <div key={f.name} className="space-y-1.5">
            <Label htmlFor={`e-${f.name}`}>{f.label}</Label>
            <input id={`e-${f.name}`} name={f.name} type={f.type} defaultValue={text(f.name)} className={`${field} h-10`}
              aria-invalid={!!err[f.name]} aria-describedby={err[f.name] ? `e-${f.name}-err` : undefined} />
            {err[f.name] && <p id={`e-${f.name}-err`} className="text-sm text-destructive">{err[f.name]}</p>}
          </div>
        ))}
      </div>
      {group("business_types", "Tipo di attività", Object.entries(BUSINESS_TYPE_LABELS))}
      {err.business_types && <p className="-mt-4 text-sm text-destructive">{err.business_types}</p>}
      {group("dive_types", "Tipi di immersione", Object.entries(DIVE_TYPE_LABELS))}
      {group("federations", "Federazioni", FEDERATIONS.map((f) => [f, f]))}
      {group("services", "Servizi", Object.entries(SERVICE_LABELS))}
      {group("languages", "Lingue parlate", Object.entries(LANGUAGE_LABELS))}

      <fieldset className="space-y-2" aria-describedby={err.video_urls ? "e-video-err" : "e-video-hint"}>
        <legend className="text-sm font-medium">Video (fino a 3)</legend>
        <p id="e-video-hint" className="text-xs text-muted-foreground">Link a video YouTube o a post e reel Instagram.</p>
        {[0, 1, 2].map((i) => (
          <input key={i} name="video_urls" type="url" placeholder="https://www.instagram.com/reel/…" aria-label={`Video ${i + 1}`}
            defaultValue={list("video_urls")[i] ?? ""} className={`${field} h-10`} aria-invalid={!!err.video_urls} />
        ))}
        {err.video_urls && <p id="e-video-err" className="text-sm text-destructive">{err.video_urls}</p>}
      </fieldset>

      {state.message && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
      {state.status === "saved" && <p role="status" className="text-sm font-medium text-primary">Modifiche salvate. Sono già online.</p>}
      <Button type="submit" className="h-11 w-full sm:w-auto sm:px-8" disabled={pending}>{pending ? "Salvataggio in corso" : "Salva modifiche"}</Button>
    </form>
  );
}
