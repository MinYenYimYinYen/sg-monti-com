"use client";

import { useSelector } from "react-redux";
import { burndownSelect } from "@/app/pace/burndown/burndownSelect";
import { BarDetail } from "@/app/pace/burndown/_components/BarDetail";
import { GroupDetail } from "@/app/pace/burndown/_components/GroupDetail";
import { MousePointerClick } from "lucide-react";

// ---------------------------------------------------------------------------
// DetailPane — always-visible right-side panel for burndown chart selections.
// Height is pinned to match the chart (h-[400px]) with internal scroll.
// ---------------------------------------------------------------------------

export function DetailPane() {
  const rechartsData = useSelector(burndownSelect.rechartsData);
  const selectedRow = useSelector(burndownSelect.selectedRow);
  const selectedGroupId = useSelector(burndownSelect.selectedGroupId);

  const selectedGroupLabel = selectedGroupId
    ? (rechartsData.groupLabels.get(selectedGroupId) ?? selectedGroupId)
    : null;

  return (
    <div className="w-96 shrink-0 h-[400px] overflow-y-auto rounded-lg border border-border bg-card p-4">
      {selectedRow ? (
        <BarDetail
          row={selectedRow}
          groupKeys={rechartsData.groupKeys}
          groupLabels={rechartsData.groupLabels}
          groupDateRanges={rechartsData.groupDateRanges}
        />
      ) : selectedGroupId && selectedGroupLabel ? (
        <GroupDetail assignmentGroupId={selectedGroupId} label={selectedGroupLabel} />
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
          <MousePointerClick className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Click a bar or legend item to see detail.
          </p>
        </div>
      )}
    </div>
  );
}
