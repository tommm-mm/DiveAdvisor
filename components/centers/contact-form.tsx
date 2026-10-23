"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Turnstile, type TurnstileHandle } from "@/components/turnstile";
import { Label } from "@/components/ui/label";
import { sendContact, type ContactState } from "@/app/diving/[regione]/[slug]/contact-action";


const field = "w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export function ContactForm({ centerId, siteKey }: { centerId: string; siteKey: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { status: "idle" });
  const widget = useRef<TurnstileHandle>(null);

  // A Turnstile token is single-use: get a fresh one after each failed attempt.
  useEffect(() => {
    if (state.status === "error") widget.current?.reset();
  }, [state]);

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-lg bg-muted p-4">
        <p className="font-medium">Richiesta inviata</p>
        <p className="mt-1 text-sm text-muted-foreground">Il diving ti risponderà all&apos;email che hai indicato.</p>
      </div>
    );
  }

  const err = state.fieldErrors ?? {};
  const v = state.values;
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="centerId" value={centerId} />
      <div className="hidden" aria-hidden>
        <label>Non compilare<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="c-name">Nome</Label>
        <input id="c-name" name="name" autoComplete="name" defaultValue={v?.name} className={`${field} h-10`}
          aria-invalid={!!err.name} aria-describedby={err.name ? "c-name-err" : undefined} />
        {err.name && <p id="c-name-err" className="text-sm text-destructive">{err.name}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-email">Email</Label>
        <input id="c-email" name="email" type="email" autoComplete="email" defaultValue={v?.email} className={`${field} h-10`}
          aria-invalid={!!err.email} aria-describedby={err.email ? "c-email-err" : undefined} />
        {err.email && <p id="c-email-err" className="text-sm text-destructive">{err.email}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-message">Messaggio</Label>
        <textarea id="c-message" name="message" rows={4} defaultValue={v?.message} className={`${field} py-2`}
          placeholder="Date, numero di persone, brevetto, cosa ti interessa"
          aria-invalid={!!err.message} aria-describedby={err.message ? "c-message-err" : undefined} />
        {err.message && <p id="c-message-err" className="text-sm text-destructive">{err.message}</p>}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <input id="c-privacy" name="privacy" type="checkbox" className="mt-0.5 size-4 accent-primary"
            aria-invalid={!!err.privacy} aria-describedby={err.privacy ? "c-privacy-err" : undefined} />
          <label htmlFor="c-privacy" className="text-sm">
            Acconsento a inviare i miei dati al diving per ricevere una risposta (<Link href="/privacy" className="text-primary underline-offset-4 hover:underline">privacy</Link>)
          </label>
        </div>
        {err.privacy && <p id="c-privacy-err" className="text-sm text-destructive">{err.privacy}</p>}
      </div>

      <Turnstile ref={widget} siteKey={siteKey} />
      {state.message && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? "Invio in corso" : "Invia richiesta"}
      </Button>
    </form>
  );
}
