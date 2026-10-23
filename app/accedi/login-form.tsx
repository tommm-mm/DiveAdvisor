"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-lg border p-4">
        <p className="font-medium">Controlla la tua email</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Abbiamo inviato un link di accesso a {state.email}. Aprilo da questo dispositivo.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <input
          id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email}
          aria-invalid={state.field === "email"} aria-describedby={state.field === "email" ? "email-error" : undefined}
          className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
        />
        {state.status === "error" && state.field !== "terms" && <p id="email-error" className="text-sm text-destructive">{state.message}</p>}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <input id="terms" name="terms" type="checkbox" className="mt-0.5 size-4 accent-primary"
            aria-invalid={state.field === "terms"} aria-describedby={state.field === "terms" ? "terms-error" : undefined} />
          <label htmlFor="terms" className="text-sm">
            Accetto i <Link href="/termini" className="text-primary underline-offset-4 hover:underline">termini d&apos;uso</Link> e ho letto l&apos;<Link href="/privacy" className="text-primary underline-offset-4 hover:underline">informativa privacy</Link>. Ho almeno 14 anni.
          </label>
        </div>
        {state.field === "terms" && <p id="terms-error" className="text-sm text-destructive">{state.message}</p>}
      </div>
      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? "Invio in corso" : "Invia link di accesso"}
      </Button>
    </form>
  );
}
