"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { confirmReview, type ConfirmState } from "@/app/recensione/conferma/actions";

export function ConfirmReviewForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmReview, { status: "idle" });
  if (state.status === "published" || state.status === "pending") {
    return (
      <div role="status" className="rounded-lg bg-muted p-4">
        <p className="font-medium">{state.status === "published" ? "Recensione pubblicata" : "Recensione inviata"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {state.status === "published" ? "Grazie. La tua recensione verificata è già visibile." : "Grazie. La pubblicheremo dopo un controllo."}
        </p>
        <Link href="/diving" className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">Torna ai diving</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-muted-foreground">Premi il pulsante per pubblicare la recensione che hai scritto.</p>
      {state.message && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" className="h-11 w-full" disabled={pending || !token}>{pending ? "Conferma in corso" : "Conferma e pubblica"}</Button>
    </form>
  );
}
