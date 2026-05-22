"use client";

import { useSelector } from "react-redux";
import { employeeCardSelect } from "@/app/bizPlan/paceCrawler/employeeCardSelect";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { paceCrawlerActions } from "@/app/bizPlan/paceCrawler/paceCrawlerSlice";
import { useAppDispatch } from "@/lib/hooks/redux";
import { DatePicker } from "@/components/DatePicker";
import { cn } from "@/style/utils";
import type { EmployeeCardData, OpenServCodeRow } from "@/app/bizPlan/paceCrawler/employeeCardSelect";

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

function ServCodeRow({ row }: { row: OpenServCodeRow }) {
  const diffColor = row.isOverdue
    ? "text-destructive"
    : row.isAhead
      ? "text-accent"
      : row.isBehind
        ? "text-secondary"
        : "text-muted-foreground";

  const rateColor = row.isOverdue
    ? "text-destructive"
    : "text-primary";

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      {/* ServCode ID + per-row status badge */}
      <div className="w-14 shrink-0 pt-0.5 flex flex-col gap-0.5">
        <span className="font-mono text-xs text-foreground truncate">
          {row.servCodeId}
        </span>
        {row.isOverdue && (
          <span className="text-[9px] text-destructive bg-destructive/10 rounded px-1 leading-tight w-fit">
            overdue
          </span>
        )}
        {!row.isOverdue && row.isBehind && (
          <span className="text-[9px] text-secondary bg-secondary/10 rounded px-1 leading-tight w-fit">
            behind
          </span>
        )}
      </div>

      {/* Required $/day — the primary number */}
      <div className="flex-1 min-w-0">
        <div className={`font-mono text-xs font-semibold ${rateColor}`}>
          {formatDollars(row.requiredDailyPrice)}/day
        </div>
        {/* Historical vs diff — secondary context */}
        <div className={`font-mono text-[10px] ${diffColor}`}>
          hist: {formatDollars(row.historicalDailyPrice)}
          {row.diffPrice !== 0 && isFinite(row.diffPrice) && (
            <span className="ml-1">
              ({row.diffPrice > 0 ? "+" : ""}{formatDollars(row.diffPrice)}
              {row.diffPercent !== null && ` / ${formatPercent(row.diffPercent)}`})
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
  const { employee, isAlreadyRouted, openServCodes } = cardData;

  // Header: neutral unless already routed today
  const headerBg = isAlreadyRouted ? "bg-destructive/10" : "bg-accent/10";

  return (
    <div className="border rounded-lg bg-card w-72 flex flex-col">
      {/* Header — employee name + routed badge only */}
      <div className={cn("flex items-center justify-between px-3 py-2 border-b rounded-t-lg", headerBg)}>
        <span className="text-sm font-semibold text-foreground truncate">
          {employee.name}
        </span>
        {isAlreadyRouted && (
          <span className="text-destructive text-xs font-medium shrink-0 ml-2">
            ⚠ Routed
          </span>
        )}
      </div>

      {/* ServCode rows */}
      <div className="flex-1 px-3 py-1">
        {openServCodes.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No open servCodes on this date
          </p>
        ) : (
          openServCodes.map((row) => (
            <ServCodeRow key={row.servCodeId} row={row} />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiffD5EmployeeCardPanel
// ---------------------------------------------------------------------------

export function DiffD5EmployeeCardPanel() {
  const dispatch = useAppDispatch();
  const mainDate = useSelector(paceCrawlerSelect.mainDate);
  const cardData = useSelector(employeeCardSelect.employeeCardData);

  const withOpen = cardData.filter((c) => c.openServCodes.length > 0).length;
  const withOverdue = cardData.filter((c) =>
    c.openServCodes.some((r) => r.isOverdue),
  ).length;
  const withBehind = cardData.filter((c) =>
    c.openServCodes.some((r) => r.isBehind && !r.isOverdue),
  ).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border bg-card">
        <DatePicker
          value={mainDate}
          onChange={(date) => dispatch(paceCrawlerActions.setMainDate(date))}
        />
        <span className="text-[10px] text-muted-foreground">
          {withOpen} employees with open work
          {withOverdue > 0 && (
            <span className="text-destructive ml-2">· {withOverdue} overdue</span>
          )}
          {withBehind > 0 && (
            <span className="text-secondary ml-2">· {withBehind} behind</span>
          )}
        </span>
      </div>

      {/* Legend */}
      <div className="shrink-0 px-3 py-1.5 border-b border-border/40 bg-card/50 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span><strong className="text-primary">Required $/day</strong> = what you need to route today to stay on track</span>
        <span><strong className="text-foreground">hist:</strong> historical avg (simulator baseline)</span>
        <span className="text-accent">green = ahead</span>
        <span className="text-secondary">orange = behind</span>
        <span className="text-destructive">red = overdue</span>
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-row flex-wrap gap-4 content-start">
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
