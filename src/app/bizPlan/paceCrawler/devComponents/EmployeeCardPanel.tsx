"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { employeeCardSelect } from "@/app/bizPlan/paceCrawler/employeeCardSelect";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { cn } from "@/style/utils";
import { ChevronRight } from "lucide-react";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";
import { EmployeeAvailability } from "@/app/employeeAvailability/EmployeeAvailabilityTypes";
import type {
  EmployeeCardData,
  OpenGroupRow,
  OpenGroupMemberRow,
} from "@/app/bizPlan/paceCrawler/_lib/diffChecker/DiffCheckerTypes";

// ---------------------------------------------------------------------------
// Availability Status
// ---------------------------------------------------------------------------

type AvailabilityStatus =
  | { kind: "available" }
  | { kind: "not_started"; startDate: string; daysUntilStart: number }
  | { kind: "ended"; endDate: string };

/**
 * Derives the employee's availability status relative to mainDate.
 * Accepts EmployeeAvailability directly so any future fields are automatically available.
 */
function getAvailabilityStatus(
  availability: EmployeeAvailability,
  mainDate: string,
): AvailabilityStatus {
  if (availability.startDate && mainDate < availability.startDate) {
    return {
      kind: "not_started",
      startDate: availability.startDate,
      daysUntilStart: dateRanges.weekdaysBetween(mainDate, availability.startDate),
    };
  }
  if (availability.endDate && mainDate > availability.endDate) {
    return { kind: "ended", endDate: availability.endDate };
  }
  return { kind: "available" };
}

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

function computeDaysLate(combinedPool: number, teamRate: number, planDeadlineWeekdays: number): number | null {
  if (teamRate <= 0) return null;
  const projectedDays = combinedPool / teamRate;
  return Math.round(projectedDays - planDeadlineWeekdays);
}

function computeDaysLeft(combinedPool: number, teamRate: number): number | null {
  if (teamRate <= 0) return null;
  return Math.round(combinedPool / teamRate);
}

function DaysAheadBadge({ days, overdueMode = false }: { days: number | null; overdueMode?: boolean }) {
  if (days === null) return <span className="font-mono text-[10px] text-muted-foreground">—</span>;
  if (days === 0 && !overdueMode) return <span className="font-mono text-[10px] text-muted-foreground">0d</span>;
  if (overdueMode) {
    return (
      <span className="font-mono text-[10px] font-semibold text-destructive">
        +{days}d left
      </span>
    );
  }
  const isLate = days > 0;
  return (
    <span className={`font-mono text-[10px] font-semibold ${isLate ? "text-destructive" : "text-accent"}`}>
      {isLate ? "+" : ""}{days}d
    </span>
  );
}

// ---------------------------------------------------------------------------
// RateTable
// ---------------------------------------------------------------------------

type RateRow = {
  label: string;
  rate: number | null;
  daysAhead: number | null;
  overdueMode?: boolean;
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
          <DaysAheadBadge days={row.daysAhead} overdueMode={row.overdueMode} />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupMemberRow
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
// GroupEntryRow
// ---------------------------------------------------------------------------

function GroupEntryRow({ row, isPriority }: { row: OpenGroupRow; isPriority: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const rateRows: RateRow[] = [];
  const isPastDeadline = row.planDeadlineWeekdays <= 0;

  if (row.goalDailyPrice !== null) {
    rateRows.push({
      label: "goal",
      rate: row.goalDailyPrice,
      daysAhead: isPastDeadline
        ? computeDaysLeft(row.combinedPool, row.sumGoals)
        : computeDaysLate(row.combinedPool, row.sumGoals, row.planDeadlineWeekdays),
      overdueMode: isPastDeadline,
      labelColor: "text-muted-foreground",
      rateColor: "text-accent",
    });
  }

  rateRows.push({
    label: "avg",
    rate: row.historicalDailyPrice,
    daysAhead: isPastDeadline
      ? computeDaysLeft(row.combinedPool, row.sumAvgs)
      : computeDaysLate(row.combinedPool, row.sumAvgs, row.planDeadlineWeekdays),
    overdueMode: isPastDeadline,
    labelColor: "text-muted-foreground",
    rateColor: "text-foreground",
  });

  rateRows.push({
    label: "req",
    rate: isPastDeadline ? null : row.requiredDailyPrice,
    daysAhead: isPastDeadline ? null : 0,
    labelColor: isPastDeadline ? "text-muted-foreground/40 line-through" : "text-muted-foreground",
    rateColor: isPastDeadline ? "text-muted-foreground/40 line-through" : "text-primary",
  });

  return (
    <div className={cn(
      "border-b border-border/40 last:border-0",
      !isPriority && "opacity-40",
    )}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2 py-1.5 text-left hover:bg-accent/5 transition-colors"
      >
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

        <div className="flex-1 min-w-0">
          <RateTable rows={rateRows} />
        </div>

        <div className="text-right shrink-0">
          <div className="font-mono text-[10px] text-muted-foreground">
            {formatDollars(row.combinedPool)} left
          </div>
          {row.planDeadline && (() => {
            const isPast = row.planDeadlineWeekdays <= 0;
            const absDays = Math.abs(row.planDeadlineWeekdays);
            return (
              <div className={`font-mono text-[10px] ${isPast ? "text-destructive/70" : "text-muted-foreground"}`}>
                {formatDate(row.planDeadline)}
                {isPast ? ` (${absDays}d past)` : ` (${absDays}d)`}
              </div>
            );
          })()}
        </div>
      </button>

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

function EmployeeCard({ cardData, mainDate }: { cardData: EmployeeCardData; mainDate: string }) {
  const { employee, isAlreadyRouted, isOnLeave, holidayDescription, isWeatherDay, openEntries } = cardData;
  const availStatus = getAvailabilityStatus(employee.availability, mainDate);
  const isUnavailable = availStatus.kind !== "available";

  const headerBg = isUnavailable
    ? "bg-primary/10"
    : isAlreadyRouted
      ? "bg-destructive/10"
      : "bg-accent/10";

  return (
    <div className="border rounded-lg bg-card w-72 flex flex-col">
      {/* Header */}
      <div className={cn("flex items-center justify-between px-3 py-2 border-b rounded-t-lg", headerBg)}>
        <span className={cn(
          "text-sm font-semibold truncate",
          isUnavailable ? "text-primary/60" : "text-foreground",
        )}>
          {employee.name}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {availStatus.kind === "not_started" && (
            <span className="text-primary/70 text-xs font-medium">🚫 Not Started</span>
          )}
          {availStatus.kind === "ended" && (
            <span className="text-primary/70 text-xs font-medium">🚫 Ended</span>
          )}
          {availStatus.kind === "available" && (
            <>
              {isAlreadyRouted && (
                <span className="text-destructive text-xs font-medium">⚠ Routed</span>
              )}
              {isOnLeave && (
                <span className="text-destructive text-xs font-medium">🏖 On Leave</span>
              )}
              {holidayDescription && (
                <span className="text-destructive text-xs font-medium">
                  {isWeatherDay ? "🌧" : "🎉"} {holidayDescription}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-3 py-2">
        {availStatus.kind === "not_started" && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-primary/70">Not yet available</p>
            <p className="text-xs text-muted-foreground">
              Starts <span className="font-mono text-foreground">{availStatus.startDate}</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              {availStatus.daysUntilStart} weekday{availStatus.daysUntilStart !== 1 ? "s" : ""} from today
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-2 leading-relaxed">
              This employee is in the plan but their workable days have not yet begun.
              The crawler will not assign work before their start date.
            </p>
          </div>
        )}

        {availStatus.kind === "ended" && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-primary/70">Availability ended</p>
            <p className="text-xs text-muted-foreground">
              Last day <span className="font-mono text-foreground">{availStatus.endDate}</span>
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-2 leading-relaxed">
              This employee is in the plan but their availability window has closed.
              The crawler will not assign work after their end date.
            </p>
          </div>
        )}

        {availStatus.kind === "available" && (
          openEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              No open servCodes on this date
            </p>
          ) : (
            <div className="py-1">
              {openEntries.map((entry, index) => (
                <GroupEntryRow
                  key={entry.groupId}
                  row={entry}
                  isPriority={index === 0}
                />
              ))}
            </div>
          )
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
  const mainDate = useSelector(paceCrawlerSelect.mainDate);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-row flex-wrap gap-4 content-start">
          {cardData.map((card) => (
            <EmployeeCard key={card.employee.employeeId} cardData={card} mainDate={mainDate} />
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
