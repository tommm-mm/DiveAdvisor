"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Non riusciamo a caricare i diving</h1>
      <p className="mt-2 text-sm text-muted-foreground">Controlla la connessione e riprova.</p>
      <Button className="mt-4" onClick={reset}>Riprova</Button>
    </main>
  );
}
