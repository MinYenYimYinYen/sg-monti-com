"use client";

import { EmployeeCardData } from "@/app/bizPlan/pace/PaceTypesRefactor";
import { Number } from "@/components/Number";
import { cn } from "@/style/utils";
import { LandPlot } from "lucide-react";

type EmployeePaceDetailProps = {
  cardData: EmployeeCardData;
};

export function EmployeePaceDetail({ cardData }: EmployeePaceDetailProps) {
  const {
    employee,
    totalAvgDailyCSP,
    allocations,
    totalFractionConsumed,
    freeCapacityFraction,
    isOverloaded,
  } = cardData;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-foreground">{employee.name}</p>
      </div>

      {/* Capacity stats */}
      <div className="rounded-md bg-accent/10 px-3 py-2 space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Total daily capacity (all programs)
        </p>
        {totalAvgDailyCSP ? (
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm items-center">
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="text-xs font-bold">#</span>
            </span>
            <span className="font-mono text-foreground">
              <Number decimals={0}>{totalAvgDailyCSP.count}</Number>
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <LandPlot className="inline w-3.5 h-3.5" />
            </span>
            <span className="font-mono text-foreground">
              <Number decimals={0}>{totalAvgDailyCSP.size}</Number>
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No lookback data — using even-split estimate
          </p>
        )}
      </div>

      {/* Allocations */}
      {allocations.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Allocations
          </p>
          <div className="space-y-1">
            {allocations.map((allocation) => {
              const isZero =
                allocation.expectedCSP.count === 0 &&
                allocation.expectedCSP.size === 0;
              const pct = allocation.fractionConsumed?.count ?? null;
              return (
                <div
                  key={allocation.servCode.servCodeId}
                  className={cn(
                    "flex items-center gap-2",
                    isZero && "opacity-40",
                  )}
                >
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
