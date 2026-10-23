"use client";

import Link from "next/link";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { reportReview, type ReportState } from "@/app/diving/[regione]/[slug]/report-action";

export function ReportForm({ reviewId }: { reviewId: string }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(reportReview, { status: "idle" });
  const pathname = usePathname();

  if (state.status === "sent") {
    return <p role="status" className="text-xs text-muted-foreground">Segnalazione inviata. La controlleremo a breve.</p>;
  }

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-primary">Segnala</summary>
      <form action={action} className="mt-2 space-y-2">
        <input type="hidden" name="reviewId" value={reviewId} />
        <label htmlFor={`report-${reviewId}`} className="block text-muted-foreground">Perché questa recensione non va bene?</label>
        <textarea id={`report-${reviewId}`} name="reason" rows={2} maxLength={1000}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
        {state.message && (
          <p role="alert" className="text-destructive">
            {state.message}{" "}
            {state.needsLogin && <Link href={`/accedi?next=${encodeURIComponent(pathname)}`} className="underline">Accedi</Link>}
          </p>
        )}
        <button type="submit" disabled={pending} className="text-primary underline-offset-4 hover:underline">
          {pending ? "Invio in corso" : "Invia segnalazione"}
        </button>
      </form>
    </details>
  );
}
