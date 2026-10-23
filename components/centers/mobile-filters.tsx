"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Filters } from "@/components/centers/filters";
import type { FilterOptions } from "@/lib/centers";

export function MobileFilters({ options, showRegion, showType, activeCount }: {
  options: FilterOptions; showRegion?: boolean; showType?: boolean; activeCount: number;
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" className="w-full" />}>
        Filtri{activeCount ? ` (${activeCount})` : ""}
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto">
        <SheetHeader><SheetTitle>Filtri</SheetTitle></SheetHeader>
        <div className="px-4 pb-6"><Filters options={options} showRegion={showRegion} showType={showType} /></div>
      </SheetContent>
    </Sheet>
  );
}
