"use client";

import { useSelector } from "react-redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { ServCodePaceCard } from "@/app/bizPlan/pace/components/ServCodePaceCard";

export function PaceDetailPanel() {
  const selectedPaces = useSelector(paceSelect.selectedPaces);
  const unfinishedOnly = useSelector(paceSelect.unfinishedOnly);
  const selectionSource = useSelector(paceSelect.selectionSource);

  if (selectionSource === "none") {
    return (
      <div className="flex items-center justify-center h-full border-2 border-dashed border-muted rounded-lg">
        <p className="text-muted-foreground text-sm">
          Select a program to view pace details
        </p>
      </div>
    );
  }

  const visiblePaces = unfinishedOnly
    ? selectedPaces.filter((p) => p.unfinishedCSP.count > 0)
    : selectedPaces;

  if (visiblePaces.length === 0) {
    return (
      <div className="flex items-center justify-center h-full border-2 border-dashed border-muted rounded-lg">
        <p className="text-muted-foreground text-sm">
          All service codes are complete
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      {visiblePaces.map((pace) => (
        <ServCodePaceCard key={pace.servCode.servCodeId} pace={pace} />
      ))}
    </div>
  );
}
