"use client";

import { useEffect } from "react";
import { CustomerDistribution } from "@/app/sanity/customerSanity/_components/CustomerDistribution";
import { CustomerSanitySortControls } from "@/app/sanity/customerSanity/_components/CustomerSanitySortControls";
import { useSanityOptions } from "@/app/sanity/_components/SanityOptionsContext";

export function CustomerSanityPanel() {
  const { setSortSlot } = useSanityOptions();

  useEffect(() => {
    setSortSlot(<CustomerSanitySortControls />);
    return () => setSortSlot(null);
  }, [setSortSlot]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Customer Sanity</span>
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
