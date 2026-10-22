"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { submitClaim, type ClaimState } from "./actions";

export function ClaimForm({ centerId }: { centerId: string }) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(submitClaim, { status: "idle" });
  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-lg border p-4">
        <p className="font-medium">Richiesta inviata</p>
        <p className="mt-1 text-sm text-muted-foreground">La verifichiamo entro pochi giorni e ti scriviamo via email.</p>
      </div>
    );
  }
  const invalid = state.status === "error";
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="centerId" value={centerId} />
      <div className="space-y-2">
        <Label htmlFor="evidence">Come possiamo verificare che sei il titolare?</Label>
        <p id="evidence-hint" className="text-sm text-muted-foreground">
          Ad esempio: il tuo ruolo, un indirizzo email con il dominio del diving o un numero da chiamare.
        </p>
        <textarea
          id="evidence" name="evidence" rows={5} required defaultValue={state.evidence}
          aria-invalid={invalid} aria-describedby={invalid ? "evidence-hint evidence-error" : "evidence-hint"}
          className="w-full rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
        />
        {invalid && <p id="evidence-error" className="text-sm text-destructive">{state.message}</p>}
      </div>
      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? "Invio in corso" : "Invia richiesta"}
      </Button>
    </form>
  );
}
