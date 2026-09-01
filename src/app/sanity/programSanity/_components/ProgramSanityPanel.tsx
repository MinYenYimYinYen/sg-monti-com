"use client";

import { ProgCodePicker } from "@/app/sanity/programSanity/_components/ProgCodePicker";
import { ServStatDistribution } from "@/app/sanity/programSanity/_components/ServStatDistribution";

export function ProgramSanityPanel() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Program code picker — fixed header area */}
      <div className="shrink-0 border-b border-border bg-card px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Program Code
        </p>
        <ProgCodePicker />
      </div>

      {/* Distribution — native scroll so accordion items scroll independently */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-1">
          <ServStatDistribution />
        </div>
      </div>
    </div>
  );
}
