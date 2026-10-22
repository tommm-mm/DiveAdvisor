import { Skeleton } from "@/components/ui/skeleton";

// Shown while the list query runs. Lives in a <Suspense> (not loading.tsx) so 404s keep their status code.
export function DirectorySkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6" aria-busy="true">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    </main>
  );
}
