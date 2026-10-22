import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4" aria-label="Principale">
        <Link href="/" className="font-semibold tracking-tight">DiveAdvisor</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/diving" className="hover:text-primary">Cerca diving</Link>
        </div>
      </nav>
    </header>
  );
}
