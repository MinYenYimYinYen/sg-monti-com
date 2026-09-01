"use client";

import { CustomerDistribution } from "@/app/sanity/customerSanity/_components/CustomerDistribution";
import { CustomerSanityOptionsSheet } from "@/app/sanity/customerSanity/_components/CustomerSanityOptionsSheet";

export function CustomerSanityPanel() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with Options trigger */}
      <div className="shrink-0 border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Customer Sanity</span>
        <CustomerSanityOptionsSheet />
      </div>

      {/* Distribution — native scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-1">
          <CustomerDistribution />
        </div>
      </div>
    </div>
  );
}
