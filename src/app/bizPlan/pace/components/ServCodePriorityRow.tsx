"use client";

import { EmployeeAllocation } from "@/app/bizPlan/pace/PaceType";
import { Number } from "@/components/Number";
import { cn } from "@/style/utils";
import { ChevronUp, ChevronDown, LandPlot } from "lucide-react";

type ServCodePriorityRowProps = {
  allocation: EmployeeAllocation;
  isFirst: boolean;
  isLast: boolean;
  onMoveUpAction: (servCodeId: string) => void;
  onMoveDownAction: (servCodeId: string) => void;
  onRemoveAction: (servCodeId: string) => void;
};

export function ServCodePriorityRow({
  allocation,
  isFirst,
  isLast,
  onMoveUpAction,
  onMoveDownAction,
  onRemoveAction,
}: ServCodePriorityRowProps) {
  const { servCode, expectedCSP, fractionConsumed } = allocation;
  const fraction = fractionConsumed?.count ?? null;
  const isOver = fraction !== null && fraction > 1;
  const pct = fraction !== null ? Math.min(fraction * 100, 100) : null;

  return (
    <div className="flex items-center gap-1.5 py-1">
      {/* Reorder controls */}
      <div className="flex flex-col shrink-0">
        <button
          onClick={() => onMoveUpAction(servCode.servCodeId)}
          disabled={isFirst}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed leading-none"
          aria-label="Move up"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={() => onMoveDownAction(servCode.servCodeId)}
          disabled={isLast}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed leading-none"
          aria-label="Move down"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* ServCode ID */}
      <span className="font-mono text-xs text-foreground w-16 shrink-0 truncate">
        {servCode.servCodeId}
      </span>

      {/* Expected / avg slash display */}
      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground flex-1 min-w-0">
        <span className="flex items-center gap-0.5">
          <span className="text-[10px] font-bold">#</span>
          <Number decimals={0}>{expectedCSP.count}</Number>
        </span>
        <span className="flex items-center gap-0.5">
          <LandPlot className="w-3 h-3" />
          <Number decimals={0}>{expectedCSP.size}</Number>
        </span>
      </div>

      {/* Capacity bar */}
      {pct !== null && (
        <div className="w-12 shrink-0">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isOver ? "bg-destructive" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p
            className={cn(
              "text-[10px] font-mono text-right mt-0.5",
              isOver ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <Number decimals={0}>{fraction! * 100}</Number>%
          </p>
        </div>
      )}

      {/* Remove */}
      <button
        onClick={() => onRemoveAction(servCode.servCodeId)}
        className="text-muted-foreground hover:text-destructive transition-colors text-sm leading-none shrink-0"
        aria-label={`Remove ${servCode.servCodeId}`}
      >
        ×
      </button>
    </div>
  );
}
