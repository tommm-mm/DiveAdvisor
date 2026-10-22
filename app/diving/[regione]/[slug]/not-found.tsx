import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Diving non trovato</h1>
      <p className="mt-2 text-sm text-muted-foreground">La scheda potrebbe essere stata spostata o rimossa.</p>
      <Link href="/diving" className="mt-4 inline-block text-primary underline-offset-4 hover:underline">Torna all&apos;elenco</Link>
    </main>
  );
}
