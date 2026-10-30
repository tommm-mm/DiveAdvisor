import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

// Team workspace for building the directory (tablet first). Every page and action re-checks the admin login.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh bg-muted/40">
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <nav aria-label="Admin" className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <Link href="/admin" className="mr-auto font-heading text-lg font-bold">DiveAdvisor <span className="text-sm font-sans font-medium text-muted-foreground">admin</span></Link>
          <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Schede</Link>
          <Link href="/admin/nuovo" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Nuova scheda</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
