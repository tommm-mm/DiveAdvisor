import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy", description: "Informativa sulla privacy di DiveAdvisor." };

// Placeholder: the full policy is written in Sprint 4 and reviewed by a professional before launch.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy</h1>
      <p className="mt-3 text-sm text-muted-foreground">Informativa in preparazione. Sito in fase di test.</p>
      <p className="mt-3 text-sm">
        Quando scrivi a un diving, il tuo nome, la tua email e il messaggio vengono salvati e inoltrati a quel diving
        solo per permettergli di risponderti.
      </p>
    </main>
  );
}
