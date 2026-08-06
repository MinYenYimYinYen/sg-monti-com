"use client";

import { useSelector } from "react-redux";
import { employeeCardSelect } from "@/app/bizPlan/paceCrawler/employeeCardSelect";
import { cn } from "@/style/utils";
import type {
  EmployeeCardData,
  OpenServCodeRow,
} from "@/app/bizPlan/paceCrawler/employeeCardSelect";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDollars(n: number): string {
  if (!isFinite(n)) return "∞";
  return `$${Math.round(n).toLocaleString()}`;
}

function formatPercent(n: number | null): string {
  if (n === null || !isFinite(n)) return "";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(0)}%`;
}

// ---------------------------------------------------------------------------
// ServCodeRow — one row per open servCode on the card
// ---------------------------------------------------------------------------

function ServCodeRow({ row, isPriority }: { row: OpenServCodeRow; isPriority: boolean }) {
  const diffColor = row.isOverdue
    ? "text-destructive"
    : row.isAhead
      ? "text-accent"
      : row.isBehind
        ? "text-secondary"
        : "text-muted-foreground";

  const rateColor = row.isOverdue ? "text-destructive" : "text-primary";

  return (
    <div className={cn(
      "flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0",
      !isPriority && "opacity-40",
    )}>
      {/* ServCode ID + per-row status badge */}
      <div className="w-14 shrink-0 pt-0.5 flex flex-col gap-0.5">
        <span className="font-mono text-xs text-foreground truncate">
          {row.servCodeId}
        </span>
        {isPriority && row.isOverdue && (
          <span className="text-[9px] text-destructive bg-destructive/10 rounded px-1 leading-tight w-fit">
            overdue
          </span>
        )}
        {isPriority && !row.isOverdue && row.isBehind && (
          <span className="text-[9px] text-secondary bg-secondary/10 rounded px-1 leading-tight w-fit">
            behind
          </span>
        )}
        {!isPriority && (
          <span className="text-[9px] text-muted-foreground bg-muted/30 rounded px-1 leading-tight w-fit">
            queued
          </span>
        )}
      </div>

      {/* Required $/day */}
      <div className="flex-1 min-w-0">
        <div className={`font-mono text-xs font-semibold ${rateColor}`}>
          {formatDollars(row.requiredDailyPrice)}/day
        </div>
        <div className={`font-mono text-[10px] ${diffColor}`}>
          hist: {formatDollars(row.historicalDailyPrice)}
          {row.diffPrice !== 0 && isFinite(row.diffPrice) && (
            <span className="ml-1">
              ({row.diffPrice > 0 ? "+" : ""}
              {formatDollars(row.diffPrice)}
              {row.diffPercent !== null &&
                ` / ${formatPercent(row.diffPercent)}`}
              )
            </span>
          )}
        </div>
      </div>

      {/* Pool remaining + days left */}
      <div className="text-right shrink-0">
        <div className="font-mono text-[10px] text-muted-foreground">
          {formatDollars(row.poolRemaining)} left
        </div>
        {!row.isOverdue && row.remainingWeekdays > 0 && (
          <div className="font-mono text-[10px] text-muted-foreground">
            {row.remainingWeekdays}d
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmployeeCard
// ---------------------------------------------------------------------------

function EmployeeCard({ cardData }: { cardData: EmployeeCardData }) {
  const { employee, isAlreadyRouted, isOnLeave, isHoliday, openServCodes } = cardData;
  const headerBg = isAlreadyRouted ? "bg-destructive/10" : "bg-accent/10";

  return (
    <div className="border rounded-lg bg-card w-72 flex flex-col">
      {/* Header — employee name + status badges */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b rounded-t-lg",
          headerBg,
        )}
      >
        <span className="text-sm font-semibold text-foreground truncate">
          {employee.name}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {isAlreadyRouted && (
            <span className="text-destructive text-xs font-medium">
              ⚠ Routed
            </span>
          )}
          {isOnLeave && (
            <span className="text-accent text-xs font-medium">
              🏖 On Leave
            </span>
          )}
          {isHoliday && (
            <span className="text-secondary text-xs font-medium">
              🎉 Holiday
            </span>
          )}
        </div>
      </div>

      {/* ServCode rows */}
      <div className="flex-1 px-3 py-1">
        {openServCodes.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No open servCodes on this date
          </p>
        ) : (
          openServCodes.map((row, index) => (
            <ServCodeRow key={row.servCodeId} row={row} isPriority={index === 0} />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmployeeCardPanel
// ---------------------------------------------------------------------------

export function EmployeeCardPanel() {
  const cardData = useSelector(employeeCardSelect.employeeCardData);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Card grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-row flex-wrap gap-4 content-start">
          {/* Employee cards */}
          {cardData.map((card) => (
            <EmployeeCard key={card.employee.employeeId} cardData={card} />
          ))}

          {cardData.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No assigned employees found. Configure assignments first.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
