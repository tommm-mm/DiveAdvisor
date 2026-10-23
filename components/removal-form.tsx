"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Turnstile, type TurnstileHandle } from "@/components/turnstile";
import { Label } from "@/components/ui/label";
import { requestRemoval, type RemovalState } from "@/app/rimuovi-scheda/actions";

const field = "w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export function RemovalForm({ siteKey, centerSlug, centerName }: { siteKey: string; centerSlug?: string; centerName?: string }) {
  const [state, action, pending] = useActionState<RemovalState, FormData>(requestRemoval, { status: "idle" });
  const widget = useRef<TurnstileHandle>(null);
  useEffect(() => {
    if (state.status === "error") widget.current?.reset();
  }, [state]);

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-lg bg-muted p-4">
        <p className="font-medium">Richiesta inviata</p>
        <p className="mt-1 text-sm text-muted-foreground">Ti scriveremo all&apos;email indicata per verificare che sei il titolare.</p>
      </div>
    );
  }

  const err = state.fieldErrors ?? {};
  const v = state.values;
  const input = (name: "centerName" | "name" | "email" | "role", label: string, type = "text", def?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`rm-${name}`}>{label}</Label>
      <input id={`rm-${name}`} name={name} type={type} defaultValue={v?.[name] ?? def} className={`${field} h-10`}
        aria-invalid={!!err[name]} aria-describedby={err[name] ? `rm-${name}-err` : undefined} />
      {err[name] && <p id={`rm-${name}-err`} className="text-sm text-destructive">{err[name]}</p>}
    </div>
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      {centerSlug && <input type="hidden" name="centerSlug" value={centerSlug} />}
      <div className="hidden" aria-hidden><label>Non compilare<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {input("centerName", "Nome del diving", "text", centerName)}
      {input("name", "Il tuo nome")}
      {input("email", "La tua email", "email")}
      {input("role", "Il tuo ruolo (es. titolare, socio)")}
      <div className="space-y-1.5">
        <Label htmlFor="rm-reason">Motivo (facoltativo)</Label>
        <textarea id="rm-reason" name="reason" rows={3} defaultValue={v?.reason} className={`${field} py-2`} aria-invalid={!!err.reason} />
        {err.reason && <p className="text-sm text-destructive">{err.reason}</p>}
      </div>
      <Turnstile ref={widget} siteKey={siteKey} />
      {state.message && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" className="h-11 w-full" disabled={pending}>{pending ? "Invio in corso" : "Invia la richiesta"}</Button>
    </form>
  );
}
