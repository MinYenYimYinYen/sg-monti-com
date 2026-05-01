"use client";

import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { PaceCategory } from "@/app/bizPlan/pace/PaceType";
import { CATEGORY_BADGE_STYLES } from "@/app/bizPlan/pace/paceStyles";
import { cn } from "@/style/utils";

const CATEGORY_LABELS: Record<PaceCategory, string> = {
  asap: "ASAP",
  overdue: "Overdue",
  inProgress: "In Progress",
  notStarted: "Not Started",
  notSet: "No Dates",
};

type ServCodeHeaderProps = {
  servCode: ServCodeDeep;
  category: PaceCategory;
};

export function ServCodeHeader({ servCode, category }: ServCodeHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-semibold text-foreground">
            {servCode.servCodeId}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {servCode.longName}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
          {servCode.progCodeId}
        </div>
      </div>
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
