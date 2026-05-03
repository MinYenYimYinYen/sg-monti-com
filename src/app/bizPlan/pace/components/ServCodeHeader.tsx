"use client";

import { PaceCategory, ServCodePace } from "@/app/bizPlan/pace/PaceType";
import { CATEGORY_BADGE_STYLES } from "@/app/bizPlan/pace/paceStyles";
import { cn } from "@/style/utils";
import { DateRangeEditor } from "@/app/bizPlan/pace/components/DateRangeEditor";

const CATEGORY_LABELS: Record<PaceCategory, string> = {
  asap: "ASAP",
  overdue: "Overdue",
  inProgress: "In Progress",
  notStarted: "Not Started",
  notSet: "No Dates",
};

type ServCodeHeaderProps = {
  pace: ServCodePace;
};

export function ServCodeHeader({ pace }: ServCodeHeaderProps) {
  const { servCode, category } = pace;
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-md font-semibold text-foreground">
            {servCode.servCodeId}
          </span>
          <span className="text-sm text-muted-foreground truncate">
            {servCode.longName}
          </span>
        </div>
      </div>

      <DateRangeEditor
        servCodeId={pace.servCode.servCodeId}
        dateRange={pace.servCode.dateRange}
      />
      <span
        className={cn(
          "shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
          CATEGORY_BADGE_STYLES[category],
        )}
      >
        {CATEGORY_LABELS[category]}
      </span>
    </div>
  );
}
