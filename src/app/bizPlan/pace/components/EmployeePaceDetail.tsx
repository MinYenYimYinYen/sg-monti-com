"use client";

import { useSelector } from "react-redux";
import { EmployeePaceSummary } from "@/app/bizPlan/pace/PaceType";
import { Number } from "@/components/Number";
import { cn } from "@/style/utils";
import { LandPlot, ChevronUp, ChevronDown } from "lucide-react";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { assignmentPlanActions } from "@/app/bizPlan/assignmentPlan/assignmentPlanSlice";
import { useAppDispatch } from "@/lib/hooks/redux";

type EmployeePaceDetailProps = {
  summary: EmployeePaceSummary;
};

export function EmployeePaceDetail({ summary }: EmployeePaceDetailProps) {
  const {
    employee,
    programType,
    maxDailyCSP,
    avgDailyCSP,
    allocations,
    totalFractionConsumed,
    freeCapacityFraction,
    isOverloaded,
  } = summary;

  const dispatch = useAppDispatch();
  const { upsert } = useAssignmentPlan({ autoLoad: false });
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);

  function handleMove(servCodeId: string, direction: "up" | "down") {
    const currentOrder = assignmentsByEmployeeId.get(employee.employeeId)?.servCodeIds ?? [];
    const idx = currentOrder.indexOf(servCodeId);
    if (idx === -1) return;
    const newOrder = [...currentOrder];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    // Optimistic update — instant UI reaction
    dispatch(assignmentPlanActions.reorderServCodes({ employeeId: employee.employeeId, servCodeIds: newOrder }));
    // Persist to server
    upsert({ employeeId: employee.employeeId, servCodeIds: newOrder });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-foreground">{employee.name}</p>
        {programType && (
          <p className="text-xs text-muted-foreground">{programType}</p>
        )}
      </div>

      {/* Capacity stats */}
      {maxDailyCSP ? (
        <div className="rounded-md bg-accent/10 px-3 py-2 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Daily capacity (lookback)
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <IconStatRow icon="#" label="Max" value={maxDailyCSP.count} />
            <IconStatRow icon="#" label="Avg" value={avgDailyCSP?.count ?? null} />
            <IconStatRow icon={<LandPlot className="inline w-3.5 h-3.5" />} label="Max" value={maxDailyCSP.size} />
            <IconStatRow icon={<LandPlot className="inline w-3.5 h-3.5" />} label="Avg" value={avgDailyCSP?.size ?? null} />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          No lookback data — using even-split estimate
        </p>
      )}

      {/* Allocations */}
      {allocations.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Allocations
          </p>
          <div className="space-y-1">
            {allocations.map((allocation, idx) => {
              const isZero =
                allocation.expectedCSP.count === 0 &&
                allocation.expectedCSP.size === 0;
              const pct = allocation.fractionConsumed?.count ?? null;
              const isFirst = idx === 0;
              const isLast = idx === allocations.length - 1;
              return (
                <div
                  key={allocation.servCode.servCodeId}
                  className={cn(
                    "flex items-center gap-2",
                    isZero && "opacity-40",
                  )}
                >
                  {/* Reorder controls */}
                  <div className="flex flex-col shrink-0">
                    <button
                      onClick={() => handleMove(allocation.servCode.servCodeId, "up")}
                      disabled={isFirst}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed leading-none"
                      aria-label="Move up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleMove(allocation.servCode.servCodeId, "down")}
                      disabled={isLast}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed leading-none"
                      aria-label="Move down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-foreground truncate">
                      {allocation.servCode.servCodeId}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                      <span># <Number decimals={0}>{allocation.expectedCSP.count}</Number></span>
                      <LandPlot className="inline w-3 h-3" />
                      <Number decimals={0}>{allocation.expectedCSP.size}</Number>
                    </p>
                  </div>
                  {pct !== null && !isZero && <CapacityBar fraction={pct} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Total capacity summary */}
      {totalFractionConsumed && (
        <div
          className={cn(
            "rounded-md px-3 py-2 text-sm space-y-1",
            isOverloaded ? "bg-destructive/15" : "bg-accent/10",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total consumed</span>
            <span
              className={cn(
                "font-mono font-medium",
                isOverloaded ? "text-destructive" : "text-foreground",
              )}
            >
              <Number decimals={0} signDisplay="auto">
                {totalFractionConsumed.count * 100}
              </Number>
              %
            </span>
          </div>
          {freeCapacityFraction && !isOverloaded && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Free capacity</span>
              <span className="font-mono font-medium text-foreground">
                <Number decimals={0}>{freeCapacityFraction.count * 100}</Number>%
              </span>
            </div>
          )}
          {isOverloaded && (
            <p className="text-destructive text-xs font-medium">
              ⚠ Overloaded — capacity exceeds 100%
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function IconStatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
}) {
  return (
    <>
      <span className="text-muted-foreground flex items-center gap-1">
        <span className="shrink-0">{icon}</span>
        {label}
      </span>
      <span className="font-mono text-foreground text-right">
        {value !== null ? <Number decimals={0}>{value}</Number> : "—"}
      </span>
    </>
  );
}

function CapacityBar({ fraction }: { fraction: number }) {
  const pct = Math.min(fraction * 100, 100);
  const isOver = fraction > 1;
  return (
    <div className="w-16 shrink-0">
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
          "text-xs font-mono text-right mt-0.5",
          isOver ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <Number decimals={0}>{fraction * 100}</Number>%
      </p>
    </div>
  );
}
