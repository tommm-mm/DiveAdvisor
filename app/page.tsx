import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { DIVE_TYPE_LABELS } from "@/lib/labels";

// Minimal home: the full hero/search comes in Sprint 4; shortcuts already link into the filtered list.
export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Trova il diving giusto, in Italia</h1>
      <p className="mt-3 text-muted-foreground">Cerca, confronta e contatta i diving, laghi compresi.</p>
      <Link href="/diving" className={buttonVariants({ size: "lg", className: "mt-6" })}>Cerca un diving</Link>
      <div className="mt-8 flex flex-wrap gap-2">
        {Object.entries(DIVE_TYPE_LABELS).map(([value, text]) => (
          <Link key={value} href={`/diving?tipo=${value}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {text}
          </Link>
        ))}
      </div>
    </main>
  );
}
