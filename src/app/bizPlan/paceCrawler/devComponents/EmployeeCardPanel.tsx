"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { employeeCardSelect } from "@/app/bizPlan/paceCrawler/employeeCardSelect";
import { cn } from "@/style/utils";
import { ChevronRight } from "lucide-react";
import type {
  EmployeeCardData,
  OpenServCodeRow,
  OpenGroupRow,
  OpenGroupMemberRow,
} from "@/app/bizPlan/paceCrawler/employeeCardSelect";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDollars(n: number): string {
  if (!isFinite(n)) return "∞";
  return `$${Math.round(n).toLocaleString()}`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

/**
 * Compute days late (+) or early (-) for the whole group at a given team rate.
 *
 * Formula: round(combinedPool / teamRate) - planDeadlineWeekdays
 *
 * Positive = days past the plan deadline (late).
 * Negative = days before the plan deadline (early).
 * Null when teamRate is 0 or planDeadlineWeekdays is 0.
 */
function computeDaysLate(combinedPool: number, teamRate: number, planDeadlineWeekdays: number): number | null {
  if (teamRate <= 0 || planDeadlineWeekdays <= 0) return null;
  const projectedDays = combinedPool / teamRate;
  return Math.round(projectedDays - planDeadlineWeekdays);
}

function DaysAheadBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="font-mono text-[10px] text-muted-foreground">—</span>;
  if (days === 0) return <span className="font-mono text-[10px] text-muted-foreground">0d</span>;
  const isLate = days > 0;
  return (
    <span className={`font-mono text-[10px] font-semibold ${isLate ? "text-destructive" : "text-accent"}`}>
      {isLate ? "+" : ""}{days}d
    </span>
  );
}

// ---------------------------------------------------------------------------
// RateTable — mini 3-row table: label | $/day | days ahead/behind
// ---------------------------------------------------------------------------

type RateRow = {
  label: string;
  rate: number | null;
  daysAhead: number | null;
  labelColor?: string;
  rateColor?: string;
};

function RateTable({ rows }: { rows: RateRow[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-1.5">
          <span className={`text-[10px] w-8 shrink-0 ${row.labelColor ?? "text-muted-foreground"}`}>
            {row.label}
          </span>
          <span className={`font-mono text-[10px] flex-1 ${row.rateColor ?? "text-foreground"}`}>
            {row.rate !== null ? `${formatDollars(row.rate)}/day` : "—"}
          </span>
          <DaysAheadBadge days={row.daysAhead} />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SingleServCodeRow — one row per open single servCode on the card
// ---------------------------------------------------------------------------

function SingleServCodeRow({ row, isPriority }: { row: OpenServCodeRow; isPriority: boolean }) {
  const rateRows: RateRow[] = [];

  if (row.goalDailyPrice !== null) {
    rateRows.push({
      label: "goal",
      rate: row.goalDailyPrice,
      daysAhead: computeDaysLate(row.poolRemaining, row.goalDailyPrice, row.remainingWeekdays),
      labelColor: "text-muted-foreground",
      rateColor: "text-accent",
    });
  }

  rateRows.push({
    label: "avg",
    rate: row.historicalDailyPrice,
    daysAhead: computeDaysLate(row.poolRemaining, row.historicalDailyPrice, row.remainingWeekdays),
    labelColor: "text-muted-foreground",
    rateColor: "text-foreground",
  });

  rateRows.push({
    label: "req",
    rate: row.isOverdue ? null : row.requiredDailyPrice,
    daysAhead: 0,
    labelColor: "text-muted-foreground",
    rateColor: row.isOverdue ? "text-destructive" : "text-primary",
  });

  return (
    <div className={cn(
      "flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0",
      !isPriority && "opacity-40",
    )}>
      {/* ServCode ID + status badge */}
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

      {/* Rate table */}
      <div className="flex-1 min-w-0">
        <RateTable rows={rateRows} />
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
// GroupMemberRow — one sub-row per member in an expanded group
// ---------------------------------------------------------------------------

function GroupMemberRow({ member }: { member: OpenGroupMemberRow }) {
  return (
    <div className="flex items-center gap-2 py-1 pl-4 border-b border-border/20 last:border-0">
      <span className="font-mono text-[10px] text-muted-foreground w-12 shrink-0">
        ↳ {member.servCodeId}
      </span>
      <div className="flex-1 min-w-0">
        <span className={`font-mono text-[10px] font-semibold ${member.isOverdue ? "text-destructive" : "text-primary"}`}>
          {formatDollars(member.requiredDailyPrice)}/day
        </span>
        {member.isOverdue && (
          <span className="ml-1 text-[9px] text-destructive bg-destructive/10 rounded px-1">overdue</span>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-[10px] text-muted-foreground">
          {formatDollars(member.poolRemaining)} left
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {member.isOverdue ? "—" : `${formatDate(member.scMax)} (${member.remainingWeekdays}d)`}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupEntryRow — group header + expandable member sub-rows
// ---------------------------------------------------------------------------

function GroupEntryRow({ row, isPriority }: { row: OpenGroupRow; isPriority: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const rateRows: RateRow[] = [];

  if (row.goalDailyPrice !== null) {
    rateRows.push({
      label: "goal",
      rate: row.goalDailyPrice,
      daysAhead: computeDaysLate(row.combinedPool, row.sumGoals, row.planDeadlineWeekdays),
      labelColor: "text-muted-foreground",
      rateColor: "text-accent",
    });
  }

  rateRows.push({
    label: "avg",
    rate: row.historicalDailyPrice,
    // For avg: scale employee's avg to team total using the same share ratio as goals
    daysAhead: computeDaysLate(
      row.combinedPool,
      row.sumGoals > 0 && row.goalDailyPrice !== null
        ? row.historicalDailyPrice / row.goalDailyPrice * row.sumGoals
        : row.historicalDailyPrice,
      row.planDeadlineWeekdays,
    ),
    labelColor: "text-muted-foreground",
    rateColor: "text-foreground",
  });

  rateRows.push({
    label: "req",
    rate: row.isOverdue ? null : row.requiredDailyPrice,
    daysAhead: row.isOverdue ? null : 0,
    labelColor: "text-muted-foreground",
    rateColor: row.isOverdue ? "text-destructive" : "text-primary",
  });

  return (
    <div className={cn(
      "border-b border-border/40 last:border-0",
      !isPriority && "opacity-40",
    )}>
      {/* Group header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2 py-1.5 text-left hover:bg-accent/5 transition-colors"
      >
        {/* Expand chevron + label + status badges */}
        <div className="w-14 shrink-0 pt-0.5 flex flex-col gap-0.5">
          <span className="flex items-center gap-0.5">
            <ChevronRight
              className={`w-3 h-3 text-primary shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
            <span className="font-mono text-[10px] text-primary font-semibold truncate">
              {row.label}
            </span>
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

        {/* Rate table: goal / avg / req */}
        <div className="flex-1 min-w-0">
          <RateTable rows={rateRows} />
        </div>

        {/* Combined pool + plan deadline */}
        <div className="text-right shrink-0">
          <div className="font-mono text-[10px] text-muted-foreground">
            {formatDollars(row.combinedPool)} left
          </div>
          {row.planDeadline && (
            <div className="font-mono text-[10px] text-muted-foreground">
              plan {formatDate(row.planDeadline)}
            </div>
          )}
        </div>
      </button>

      {/* Member sub-rows (shown when expanded) */}
      {expanded && (
        <div className="bg-accent/5">
          {row.members.map((member) => (
            <GroupMemberRow key={member.servCodeId} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmployeeCard
// ---------------------------------------------------------------------------

function EmployeeCard({ cardData }: { cardData: EmployeeCardData }) {
  const { employee, isAlreadyRouted, isOnLeave, isHoliday, openEntries } = cardData;
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

      {/* Entry rows */}
      <div className="flex-1 px-3 py-1">
        {openEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No open servCodes on this date
          </p>
        ) : (
          openEntries.map((entry, index) => {
            if (entry.kind === "single") {
              return (
                <SingleServCodeRow
                  key={entry.servCodeId}
                  row={entry}
                  isPriority={index === 0}
                />
              );
            } else {
              return (
                <GroupEntryRow
                  key={entry.groupId}
                  row={entry}
                  isPriority={index === 0}
                />
              );
            }
          })
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
