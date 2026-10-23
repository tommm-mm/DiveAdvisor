"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Turnstile, type TurnstileHandle } from "@/components/turnstile";
import { Label } from "@/components/ui/label";
import { submitReview, type ReviewState } from "@/app/diving/[regione]/[slug]/recensione/actions";
import { CRITERIA } from "@/lib/review-utils";

const field = "w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

type Props = { centerId: string; centerUrl: string; siteKey: string; initialCode: string };

export function ReviewForm({ centerId, centerUrl, siteKey, initialCode }: Props) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, { status: "idle" });
  const widget = useRef<TurnstileHandle>(null);

  // A Turnstile token is single-use: get a fresh one after each failed attempt.
  useEffect(() => {
    if (state.status === "error") widget.current?.reset();
  }, [state]);

  if (state.status === "published" || state.status === "pending") {
    return (
      <div role="status" className="rounded-lg bg-muted p-4">
        <p className="font-medium">{state.status === "published" ? "Recensione pubblicata" : "Recensione inviata"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {state.status === "published"
            ? "Grazie. La tua recensione verificata è già visibile nella scheda."
            : "Grazie. La pubblicheremo dopo un controllo, con l'etichetta non verificata."}
        </p>
        <Link href={centerUrl} className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">Torna alla scheda</Link>
      </div>
    );
  }

  const err = state.fieldErrors ?? {};
  const v = state.values;
  const maxDate = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="centerId" value={centerId} />

      <div className="space-y-4">
        {CRITERIA.map((c) => (
          <fieldset key={c.key} aria-describedby={err[c.key] ? `r-${c.key}-err` : undefined}>
            <legend className="text-sm font-medium">{c.label}</legend>
            <div className="mt-1.5 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="cursor-pointer">
                  <input type="radio" name={c.key} value={n} defaultChecked={v?.[c.key] === String(n)}
                    className="peer sr-only" aria-label={`${c.label}: ${n} su 5`} />
                  <span className="flex size-10 items-center justify-center rounded-lg border text-sm peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                    {n}
                  </span>
                </label>
              ))}
            </div>
            {err[c.key] && <p id={`r-${c.key}-err`} className="mt-1 text-sm text-destructive">{err[c.key]}</p>}
          </fieldset>
        ))}
        <p className="text-xs text-muted-foreground">1 = pessimo, 5 = ottimo</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="r-date">Data dell&apos;immersione</Label>
        <input id="r-date" name="diveDate" type="date" max={maxDate} defaultValue={v?.diveDate} className={`${field} h-10`}
          aria-invalid={!!err.diveDate} aria-describedby={err.diveDate ? "r-date-err" : undefined} />
        {err.diveDate && <p id="r-date-err" className="text-sm text-destructive">{err.diveDate}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="r-text">La tua esperienza</Label>
        <textarea id="r-text" name="text" rows={6} defaultValue={v?.text} className={`${field} py-2`}
          placeholder="Com'è andata l'immersione, il briefing, l'attrezzatura, lo staff"
          aria-invalid={!!err.text} aria-describedby={err.text ? "r-text-err" : "r-text-hint"} />
        {err.text
          ? <p id="r-text-err" className="text-sm text-destructive">{err.text}</p>
          : <p id="r-text-hint" className="text-xs text-muted-foreground">Da 40 a 2000 caratteri</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="r-code">Codice di verifica (facoltativo)</Label>
        <input id="r-code" name="code" autoComplete="off" autoCapitalize="characters" placeholder="K7MQ-3XPA"
          defaultValue={v?.code ?? initialCode} className={`${field} h-10 uppercase`}
          aria-invalid={!!err.code} aria-describedby={err.code ? "r-code-err" : "r-code-hint"} />
        {err.code
          ? <p id="r-code-err" className="text-sm text-destructive">{err.code}</p>
          : <p id="r-code-hint" className="text-xs text-muted-foreground">Te lo dà il diving dopo l&apos;immersione. Senza codice la recensione viene controllata prima della pubblicazione.</p>}
      </div>

      <Turnstile ref={widget} siteKey={siteKey} />
      {state.message && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Invio in corso" : "Pubblica recensione"}
      </Button>
    </form>
  );
}
