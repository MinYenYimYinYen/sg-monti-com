"use client";

import { useSelector } from "react-redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { ServCodePaceCard } from "@/app/bizPlan/pace/components/ServCodePaceCard";
import { Button } from "@/style/components/button";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { authSelect } from "@/app/auth/authSlice";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";

export function PaceDetailPanel() {
  const selectedPaces = useSelector(paceSelect.selectedPaces);
  const unfinishedOnly = useSelector(paceSelect.unfinishedOnly);
  const activeFilters = useSelector(paceSelect.activeFilters);
  const selectionSource = useSelector(paceSelect.selectionSource);
  const unsavedServCodeChanges = useSelector(
    progServSelect.unsavedServCodeChanges,
  );
  const isAdmin = useSelector(authSelect.role) === "admin";
  const { saveServCodeChanges } = useProgServ({});

  // Only surface changes where the dateRange itself changed — other staged
  // changes (e.g. productRules) belong to their own save flows.
  const dateRangeChanges = unsavedServCodeChanges.filter(
    (c) =>
      c.updated.dateRange.min !== c.original.dateRange.min ||
      c.updated.dateRange.max !== c.original.dateRange.max,
  );

  if (selectionSource === "none") {
    return (
      <div className="flex items-center justify-center h-full border-2 border-dashed border-muted rounded-lg">
        <p className="text-muted-foreground text-sm">
          Select a program to view pace details
        </p>
      </div>
    );
  }

  const visiblePaces = selectedPaces.filter((p) => {
    if (!activeFilters.includes(p.category)) return false;
    return !(unfinishedOnly && p.unfinishedCSP.count === 0);

  });

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
    <div className={"flex flex-col gap-1 h-full overflow-y-auto pr-1"}>
      {isAdmin && (
        <div className="flex items-center justify-start">
          <Button
            disabled={dateRangeChanges.length === 0}
            onClick={() => saveServCodeChanges(dateRangeChanges)}
          >
            Save All Date Range Changes
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
        {visiblePaces.map((pace) => (
          <ServCodePaceCard key={pace.servCode.servCodeId} pace={pace} />
        ))}
      </div>
    </div>
  );
}
