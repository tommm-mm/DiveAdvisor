import type { Metadata } from "next";
import { ConfirmReviewForm } from "@/components/reviews/confirm-review-form";

export const metadata: Metadata = { title: "Conferma la recensione", robots: { index: false } };

// A button, not an automatic confirm on page load: email scanners that open links must not publish reviews.
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Conferma la tua recensione</h1>
      <div className="mt-6"><ConfirmReviewForm token={token ?? ""} /></div>
    </main>
  );
}
