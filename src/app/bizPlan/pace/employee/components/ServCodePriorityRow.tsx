"use client";

import { EmployeeAllocation } from "@/app/bizPlan/pace/PaceType";
import { MiniServCodeControls } from "@/app/bizPlan/pace/employee/components/MiniServCodeControls";
import { ServCodePaceBar } from "@/app/bizPlan/pace/employee/components/ServCodePaceBar";
import { employeePaceSelect } from "@/app/bizPlan/pace/employee/employeePaceSelect";
import { CountSizePrice, baseCountSizePrice } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { Number } from "@/components/Number";
import { ChevronUp, ChevronDown, Crosshair, MoveUpRight, MoveRight, MoveDownRight } from "lucide-react";
import { cn } from "@/style/utils";
import { useSelector } from "react-redux";

// ±5% band around required pace:
//   MoveUpRight  + destructive (red)  — behind, need to go faster
//   MoveRight    + accent     (green) — on track
//   MoveDownRight + primary   (blue)  — ahead, can slow down
const AVG_VS_REQUIRED_TOLERANCE = 0.05;

type PaceStatus = "behind" | "onTrack" | "ahead";

function getPaceStatus(avg: number, required: number): PaceStatus {
  if (required <= 0) return "onTrack"; // nothing required — on track by definition
  const ratio = avg / required;
  if (ratio >= 1 + AVG_VS_REQUIRED_TOLERANCE) return "ahead";
  if (ratio >= 1 - AVG_VS_REQUIRED_TOLERANCE) return "onTrack";
  return "behind";
}

const STATUS_COLOR_CLASS: Record<PaceStatus, string> = {
  behind: "text-destructive",
  onTrack: "text-accent",
  ahead: "text-primary",
};

const STATUS_ICON: Record<PaceStatus, React.ElementType> = {
  behind: MoveUpRight,
  onTrack: MoveRight,
  ahead: MoveDownRight,
};

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

  const shareRemainingMap = useSelector(employeePaceSelect.employeeShareRemainingMap);
  const employeeUnfinishedCSP: CountSizePrice =
    shareRemainingMap.get(employeeId)?.get(servCode.servCodeId) ?? { ...baseCountSizePrice };

  const hasAvg = avgDailyCSP !== null;
  const status: PaceStatus = hasAvg
    ? getPaceStatus(avgDailyCSP!.count, expectedCSP.count)
    : "onTrack";
  const statusColorClass = STATUS_COLOR_CLASS[status];
  const StatusIcon = STATUS_ICON[status];

  return (
    <div className="py-1.5 space-y-1">
      {/* Top line: reorder + ID + pace counts + remove */}
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

        {/* Avg count/size  [directional icon]  Required count/size */}
        <div className="flex items-center gap-1 text-xs font-mono flex-1 min-w-0">
          {hasAvg && (
            <>
              <span className="flex items-center gap-0.5 text-foreground">
                <Number decimals={0}>{avgDailyCSP!.count}</Number>
                <span className="text-muted-foreground">/</span>
                <Number decimals={0}>{avgDailyCSP!.size}</Number>
              </span>

              {/* Directional icon — colored by pace status */}
              <StatusIcon className={cn("w-3 h-3 shrink-0", statusColorClass)} />
            </>
          )}

          {/* Required — prefixed with Crosshair, colored by pace status */}
          <span className={cn("flex items-center gap-0.5", statusColorClass)}>
            <Crosshair className="w-3 h-3 shrink-0" />
            <Number decimals={0}>{expectedCSP.count}</Number>
            <span className="text-muted-foreground">/</span>
            <Number decimals={0}>{expectedCSP.size}</Number>
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
