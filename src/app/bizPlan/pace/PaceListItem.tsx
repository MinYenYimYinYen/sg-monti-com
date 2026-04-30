"use client";

import { ServCodePace } from "@/app/bizPlan/pace/PaceType";
import { Badge } from "@/style/components/badge";
import { cn } from "@/style/utils";

type PaceListItemProps = {
  pace: ServCodePace;
  isSelected: boolean;
  onSelectAction: (servCodeId: string) => void;
};

export function PaceListItem({
  pace,
  isSelected,
  onSelectAction,
}: PaceListItemProps) {
  const { servCode, finishedCSP, unfinishedCSP, category } = pace;
  const total = finishedCSP.count + unfinishedCSP.count;

  return (
    <button
      onClick={() => onSelectAction(servCode.servCodeId)}
      className={cn(
        "w-full text-left px-2.5 py-2 rounded-md transition-colors border",
        isSelected
          ? "bg-primary/15 border-primary/30"
          : "hover:bg-accent/10 border-transparent",
      )}
    >
      {/* Line 1: id — name */}
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="font-mono text-xs shrink-0 text-foreground">
          {servCode.servCodeId}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          — {servCode.longName}
        </span>
      </div>

      {/* Line 2: date range · ASAP badge · count */}
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <Badge
          variant="secondary"
          intensity="soft"
          className={cn(
            "text-[10px] px-1.5 py-0 h-4 font-normal",
            !servCode.dateRange.min && !servCode.dateRange.max
              ? "bg-muted/30 text-muted-foreground"
              : "bg-secondary/30",
          )}
        >
          {servCode.dateRange.min || servCode.dateRange.max
            ? `${servCode.dateRange.min || "?"} – ${servCode.dateRange.max || "?"}`
            : "No dates"}
        </Badge>

        {category === "asap" && (
          <Badge
            variant="destructive"
            intensity="soft"
            className="text-[10px] px-1.5 py-0 h-4 font-normal"
          >
            ASAP
          </Badge>
        )}

        <span className="text-[10px] text-muted-foreground font-mono">
          {finishedCSP.count}/{total}
        </span>
      </div>
    </button>
  );
}
