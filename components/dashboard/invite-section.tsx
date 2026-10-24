"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { createInvite, type InviteResult } from "@/app/dashboard/actions";

// One tap per dive: a group link for the boat's WhatsApp group, or a single invite.
// WhatsApp opens on the owner's phone with the message ready; we never see customers' numbers.
export function InviteSection({ centerId, centerName }: { centerId: string; centerName?: string }) {
  const [uses, setUses] = useState(6);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3 rounded-2xl border p-4">
      {centerName && <p className="font-medium">{centerName}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor={`uses-${centerId}`} className="text-sm font-medium">Subacquei nel gruppo</label>
          <select id={`uses-${centerId}`} value={uses} onChange={(e) => { setUses(Number(e.target.value)); setResult(null); }}
            className="h-10 rounded-lg border bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <option value={1}>1 persona</option>
            {Array.from({ length: 19 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n} persone</option>)}
          </select>
        </div>
        <Button type="button" disabled={pending} onClick={() => start(async () => setResult(await createInvite(centerId, uses)))}>
          {pending ? "Creazione in corso" : uses > 1 ? "Crea il link per il gruppo" : "Crea l'invito"}
        </Button>
      </div>
      {result && !result.ok && <p role="alert" className="text-sm text-destructive">{result.error}</p>}
      {result?.ok && (
        <div role="status" className="space-y-2 rounded-xl bg-muted p-3">
          <p className="text-sm">
            {result.uses > 1
              ? `Link pronto: vale per ${result.uses} recensioni verificate, una a testa, per 7 giorni.`
              : "Invito pronto: vale per una recensione verificata, per 30 giorni."}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(result.message)}`} target="_blank" rel="noopener"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline">Invia su WhatsApp</a>
            <CopyButton value={result.message} label="Copia il messaggio" />
            <CopyButton value={result.url} label="Copia solo il link" />
          </div>
        </div>
      )}
    </div>
  );
}
