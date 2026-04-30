"use client";

import { useSelector } from "react-redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";

export function PaceDetailPanel() {
  const pace = useSelector(paceSelect.selectedPace);

  if (!pace) {
    return (
      <div className="flex items-center justify-center h-full border-2 border-dashed border-muted rounded-lg">
        <p className="text-muted-foreground text-sm">
          Select a service code to view pace details
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg h-full">
      <div>
        <h2 className="text-sm font-semibold font-mono">
          {pace.servCode.servCodeId}
        </h2>
        <p className="text-sm text-muted-foreground">{pace.servCode.longName}</p>
      </div>
      <p className="text-xs text-muted-foreground italic">
        Detail view coming soon.
      </p>
    </div>
  );
}
