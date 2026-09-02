"use client";

import { useSanityOptions } from "@/app/sanity/_components/SanityOptionsContext";
import { ExcludedProgCodeFilter } from "@/app/sanity/customerSanity/_components/ExcludedProgCodeFilter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/style/components/sheet";
import { Button } from "@/style/components/button";
import { Label } from "@/style/components/label";
import { Settings2 } from "lucide-react";

export function SanityOptionsSheet() {
  const { sortSlot } = useSanityOptions();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-4 w-4" />
          Options
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Sanity Options</SheetTitle>
        </SheetHeader>

        {/* Page-specific sort controls — injected by the active page */}
        {sortSlot && (
          <div className="mb-6">
            {sortSlot}
          </div>
        )}

        {/* Shared — Exclude Prog Codes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Exclude Prog Codes
            </p>
          </div>
          <Label className="text-xs text-muted-foreground block mb-2">
            Excluded codes are removed from combo keys before grouping.
          </Label>
          <ExcludedProgCodeFilter />
        </section>
      </SheetContent>
    </Sheet>
  );
}
