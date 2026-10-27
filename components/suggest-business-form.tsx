"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Turnstile, type TurnstileHandle } from "@/components/turnstile";
import { suggestBusiness, type SuggestState } from "@/app/eudi/actions";
import { BUSINESS_TYPE_LABELS } from "@/lib/labels";
import { REGIONS } from "@/lib/regions";

const field = "w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export function SuggestBusinessForm({ siteKey, source = "sito" }: { siteKey: string; source?: string }) {
  const [state, action, pending] = useActionState<SuggestState, FormData>(suggestBusiness, { status: "idle" });
  const widget = useRef<TurnstileHandle>(null);
  useEffect(() => { if (state.status === "error") widget.current?.reset(); }, [state]);

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-xl bg-background p-4">
        <p className="font-medium">Richiesta inviata</p>
        <p className="mt-1 text-sm text-muted-foreground">Verifichiamo i dati e ti scriviamo quando la scheda è online.</p>
      </div>
    );
  }
  const err = state.fieldErrors ?? {};
  const v = state.values;
  const input = (name: "name" | "city" | "address" | "email" | "phone" | "website", label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={`sg-${name}`}>{label}</Label>
      <input id={`sg-${name}`} name={name} type={type} defaultValue={v?.[name]} className={`${field} h-11`}
        aria-invalid={!!err[name]} aria-describedby={err[name] ? `sg-${name}-err` : undefined} />
      {err[name] && <p id={`sg-${name}-err`} className="text-sm text-destructive">{err[name]}</p>}
    </div>
  );
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="hidden" aria-hidden><label>Non compilare<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
      <input type="hidden" name="source" value={source} />
      {input("name", "Nome dell'attività")}
      <div className="space-y-1.5">
        <Label htmlFor="sg-region">Regione</Label>
        <select id="sg-region" name="region" defaultValue={v?.region ?? ""} className={`${field} h-11`}
          aria-invalid={!!err.region} aria-describedby={err.region ? "sg-region-err" : undefined}>
          <option value="" disabled>Scegli la regione</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {err.region && <p id="sg-region-err" className="text-sm text-destructive">{err.region}</p>}
      </div>
      {input("city", "Città")}
      {input("address", "Indirizzo (facoltativo, per la mappa)")}
      <fieldset className="space-y-2" aria-describedby={err.types ? "sg-types-err" : undefined}>
        <legend className="text-sm font-medium">Tipo di attività</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(BUSINESS_TYPE_LABELS).map(([value, text]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/10">
              <input type="checkbox" name="types" value={value} defaultChecked={value === "diving"} className="size-4 accent-primary" />
              {text}
            </label>
          ))}
        </div>
        {err.types && <p id="sg-types-err" className="text-sm text-destructive">{err.types}</p>}
      </fieldset>
      {input("email", "Email dell'attività (visibile nella scheda)", "email")}
      {input("phone", "Telefono (facoltativo)", "tel")}
      {input("website", "Sito web (facoltativo)", "url")}
      <Turnstile ref={widget} siteKey={siteKey} />
      {state.message && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" className="h-11 w-full rounded-xl" disabled={pending}>{pending ? "Invio in corso" : "Aggiungi attività"}</Button>
    </form>
  );
}
