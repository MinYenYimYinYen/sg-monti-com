"use client";

import { EmployeePaceSummary } from "@/app/bizPlan/pace/PaceType";
import { Number } from "@/components/Number";
import { cn } from "@/style/utils";

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
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <StatRow label="Max count" value={maxDailyCSP.count} />
            <StatRow label="Avg count" value={avgDailyCSP?.count ?? null} />
            <StatRow label="Max size" value={maxDailyCSP.size} />
            <StatRow label="Avg size" value={avgDailyCSP?.size ?? null} />
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
          <div className="space-y-1.5">
            {allocations.map((allocation) => {
              const pct = allocation.fractionConsumed?.count ?? null;
              return (
                <div
                  key={allocation.servCode.servCodeId}
                  className="flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">
                      {allocation.servCode.longName}
                    </p>
                    {allocation.expectedCSP && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        <Number decimals={0}>{allocation.expectedCSP.count}</Number>
                        {" / "}
                        <Number decimals={0}>{allocation.expectedCSP.size}</Number>
                      </p>
                    )}
                  </div>
                  {pct !== null && (
                    <CapacityBar fraction={pct} />
                  )}
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
            "rounded-md px-3 py-2 text-xs space-y-1",
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
            <p className="text-destructive text-[10px] font-medium">
              ⚠ Overloaded — capacity exceeds 100%
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground text-right">
        {value !== null ? (
          <Number decimals={0}>{value}</Number>
        ) : (
          "—"
        )}
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
          "text-[10px] font-mono text-right mt-0.5",
          isOver ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <Number decimals={0}>{fraction * 100}</Number>%
      </p>
    </div>
  );
}
