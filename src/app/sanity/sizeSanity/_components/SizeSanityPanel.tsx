"use client";

import { useSelector } from "react-redux";
import { sizeSanitySelect } from "@/app/sanity/sizeSanity/sizeSanitySelect";
import { SizeSanityCustomerList } from "@/app/sanity/sizeSanity/_components/SizeSanityCustomerList";
import { useFullSeasonServices } from "@/app/realGreen/customer/hooks/useFullSeasonServices";
import { RefreshCw } from "lucide-react";
import { Button } from "@/style/components/button";

export function SizeSanityPanel() {
  const { refresh, canRefresh } = useFullSeasonServices();
  const customerCount = useSelector(sizeSanitySelect.customerCount);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 flex items-center gap-3">
        <span className="text-sm text-muted-foreground flex-1">
          {customerCount > 0
            ? `${customerCount} customer${customerCount !== 1 ? "s" : ""} with size or price discrepancies`
            : "No discrepancies found"}
        </span>
        <Button
          variant="primary"
          intensity="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={refresh}
          disabled={!canRefresh}
          title="Refresh all customer data"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-2">
          <SizeSanityCustomerList />
        </div>
      </div>
    </div>
  );
}
