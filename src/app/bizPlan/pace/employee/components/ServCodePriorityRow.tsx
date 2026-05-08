"use client";

import { EmployeeAllocation } from "@/app/bizPlan/pace/PaceType";
import { MiniServCodeControls } from "@/app/bizPlan/pace/employee/components/MiniServCodeControls";
import { ServCodePaceBar } from "@/app/bizPlan/pace/employee/components/ServCodePaceBar";
import { employeePaceSelect } from "@/app/bizPlan/pace/employee/employeePaceSelect";
import { CountSizePrice, baseCountSizePrice } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { Number } from "@/components/Number";
import { ChevronUp, ChevronDown, LandPlot } from "lucide-react";
import { useSelector } from "react-redux";

type ServCodePriorityRowProps = {
  allocation: EmployeeAllocation;
  employeeId: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUpAction: (servCodeId: string) => void;
  onMoveDownAction: (servCodeId: string) => void;
  onRemoveAction: (servCodeId: string) => void;
};

export function ServCodePriorityRow({
  allocation,
  employeeId,
  isFirst,
  isLast,
  onMoveUpAction,
  onMoveDownAction,
  onRemoveAction,
}: ServCodePriorityRowProps) {
  const { servCode, avgDailyCSP, expectedCSP } = allocation;
  // Show the employee's historical average (avgDailyCSP) — what they actually do.
  // expectedCSP is the cascade allocation (capped by capacity), which can be lower.
  const displayCSP = avgDailyCSP ?? expectedCSP;

  const shareRemainingMap = useSelector(employeePaceSelect.employeeShareRemainingMap);
  const employeeUnfinishedCSP: CountSizePrice =
    shareRemainingMap.get(employeeId)?.get(servCode.servCodeId) ?? { ...baseCountSizePrice };

  return (
    <div className="py-1.5 space-y-1">
      {/* Top line: reorder + ID + CSP + remove */}
      <div className="flex items-center gap-1.5">
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

        {/* ServCode ID — click opens MiniServCodeControls popover */}
        <MiniServCodeControls servCode={servCode}>
          <span className="font-mono text-xs text-foreground w-14 shrink-0 truncate">
            {servCode.servCodeId}
          </span>
        </MiniServCodeControls>

        {/* CSP: count + size + price — shows avgDailyCSP (historical average) */}
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground flex-1 min-w-0">
          <span className="flex items-center gap-0.5">
            <span className="text-[10px] font-bold">#</span>
            <Number decimals={0}>{displayCSP.count}</Number>
          </span>
          <span className="flex items-center gap-0.5">
            <LandPlot className="w-3 h-3" />
            <Number decimals={0}>{displayCSP.size}</Number>
          </span>
          <span className="flex items-center gap-0.5">
            <Number isMoney decimals={0}>{displayCSP.price}</Number>
          </span>
        </div>

        {/* Remove */}
        <button
          onClick={() => onRemoveAction(servCode.servCodeId)}
          className="text-muted-foreground hover:text-destructive transition-colors text-sm leading-none shrink-0"
          aria-label={`Remove ${servCode.servCodeId}`}
        >
          ×
        </button>
      </div>

      {/* Pace bar — uses employee's avgDailyCSP and their share of remaining work */}
      <div className="pl-5 pr-4">
        <ServCodePaceBar
          servCodeId={servCode.servCodeId}
          avgDailyCSP={allocation.avgDailyCSP ?? null}
          employeeUnfinishedCSP={employeeUnfinishedCSP}
        />
      </div>
    </div>
  );
}
