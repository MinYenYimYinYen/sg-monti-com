"use client";

import { useSelector } from "react-redux";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import type { SeasonOptimizedRange } from "@/app/bizPlan/paceCrawler/PaceCrawlerTypes";

// ---------------------------------------------------------------------------
// GanttGroupStatusDetail — status-based popover for a Gantt bar
//
// Shows a snapshot of the group's price remaining as of the "As of" date.
// For past dates: uses doneDate to determine what was completed by then.
// For future dates: all non-completed services count as remaining.
// ---------------------------------------------------------------------------

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

function formatDollars(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

type GanttGroupStatusDetailProps = {
  row: SeasonOptimizedRange;
  asOfDate: string;
};

export function GanttGroupStatusDetail({ row, asOfDate }: GanttGroupStatusDetailProps) {
  const servCodeMap = useSelector(deepSelect.servCodeMap);
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const totalAvgDailyPriceByEmployee = useSelector(paceCrawlerSelect.totalAvgDailyPriceByEmployee);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);

  const isGroup = row.memberServCodeIds.length > 1;

  // ---------------------------------------------------------------------------
  // Compute price remaining as of asOfDate
  // ---------------------------------------------------------------------------
  let priceCompleted = 0;
  let priceRemaining = 0;
  let pricePrinted = 0;
  let totalServices = 0;
  let completedServices = 0;

  for (const servCodeId of row.memberServCodeIds) {
    const servCode = servCodeMap.get(servCodeId);
    if (!servCode) continue;

    for (const service of servCode.services) {
      if (service.status === "N") continue; // never — exclude
      // Skip skip statuses (single uppercase letters other than S, Y, $, *)
      if (/^[A-Z]$/.test(service.status) && service.status !== "S" && service.status !== "Y") continue;

      totalServices++;
      const price = service.price;

      if (service.status === "S") {
        // Completed — check if done by asOfDate
        const doneDate = service.production?.doneDate ?? null;
        if (doneDate && doneDate <= asOfDate) {
          priceCompleted += price;
          completedServices++;
        } else {
          // Completed after asOfDate — counts as remaining on asOfDate
          priceRemaining += price;
        }
      } else if (service.status === "$") {
        // Printed (scheduled but not done)
        pricePrinted += price;
        priceRemaining += price;
      } else {
        // Active (Y) or asap (*) — remaining
        priceRemaining += price;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Compute crew and team $/day
  //
  // Past/today: derive from actual doneBy records on completed services.
  // Future: use assignment plan (crawler-based).
  // ---------------------------------------------------------------------------
  const today = new Date().toISOString().slice(0, 10);
  const isPastOrToday = asOfDate <= today;

  let teamDailyRate = 0;
  const crewMembers: { name: string; rate: number; avgRate: number }[] = [];

  if (isPastOrToday) {
    // Aggregate actual workers from doneBy records on services completed by asOfDate
    const employeePriceMap = new Map<string, number>(); // employeeId → attributed price completed

    for (const servCodeId of row.memberServCodeIds) {
      const servCode = servCodeMap.get(servCodeId);
      if (!servCode) continue;

      for (const service of servCode.services) {
        if (service.status !== "S") continue;
        const doneDate = service.production?.doneDate ?? null;
        if (!doneDate || doneDate > asOfDate) continue;

        const doneBys = service.production?.doneBys ?? [];
        for (const doneBy of doneBys) {
          const attributed = service.price * (doneBy.percent ?? 1);
          employeePriceMap.set(doneBy.employeeId, (employeePriceMap.get(doneBy.employeeId) ?? 0) + attributed);
        }
        // Also count printed services as "in progress" for today
      }
      // For today: also include employees with printed services in this group
      if (asOfDate === today) {
        for (const service of servCode.services) {
          if (service.status !== "$") continue;
          const mostRecent = service.assignments?.mostRecent;
          if (!mostRecent?.employeeId) continue;
          if (!employeePriceMap.has(mostRecent.employeeId)) {
            employeePriceMap.set(mostRecent.employeeId, 0);
          }
        }
      }
    }

    for (const [employeeId, _completedPrice] of employeePriceMap) {
      const employee = employeeMap.get(employeeId);
      const avgRate = totalAvgDailyPriceByEmployee.get(employeeId) ?? 0;
      // For past/today, show avg rate as the rate (no goal-based rate available per-group)
      teamDailyRate += avgRate;
      crewMembers.push({
        name: employee?.name ?? employeeId,
        rate: avgRate,
        avgRate,
      });
    }
  } else {
    // Future: use assignment plan
    for (const [employeeId, plan] of assignmentsByEmployeeId) {
      const groupAssignment = plan.groupAssignments.find((ga) => ga.groupId === row.groupLabel);
      if (!groupAssignment) continue;

      const goal = groupAssignment.dailyRevenueGoal;
      const avgRate = totalAvgDailyPriceByEmployee.get(employeeId) ?? 0;
      const rate = goal !== null ? goal : avgRate;
      teamDailyRate += rate;

      const employee = employeeMap.get(employeeId);
      crewMembers.push({
        name: employee?.name ?? employeeId,
        rate,
        avgRate,
      });
    }
  }

  const daysToComplete = teamDailyRate > 0 ? priceRemaining / teamDailyRate : null;

  // Projected finish: asOfDate + daysToComplete weekdays
  // Simple approximation: calendar days ≈ weekdays * 7/5
  const projectedFinish = row.projectedEndDate;

  return (
    <div className="flex flex-col gap-2 min-w-[240px]">
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground font-mono">{row.groupLabel}</span>
          {isGroup && (
            <span className="text-[9px] text-primary bg-primary/10 rounded px-1">
              group · {row.memberServCodeIds.length} servCodes
            </span>
          )}
        </div>
        {isGroup && (
          <span className="text-[9px] text-muted-foreground font-mono">
            {row.memberServCodeIds.join(" · ")}
          </span>
        )}
        <span className="text-[9px] text-muted-foreground">As of {formatDate(asOfDate)}</span>
      </div>

      {/* Price breakdown */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Price Remaining</span>
          <span className="font-mono font-semibold text-foreground">{formatDollars(priceRemaining)}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] pl-2">
          <span className="text-muted-foreground/70">— completed by {formatDate(asOfDate)}</span>
          <span className="font-mono text-accent">{formatDollars(priceCompleted)}</span>
        </div>
        {pricePrinted > 0 && (
          <div className="flex items-center justify-between text-[10px] pl-2">
            <span className="text-muted-foreground/70">— printed (scheduled)</span>
            <span className="font-mono text-muted-foreground">{formatDollars(pricePrinted)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] pl-2">
          <span className="text-muted-foreground/70">— services</span>
          <span className="font-mono text-muted-foreground">{completedServices}/{totalServices} done</span>
        </div>
      </div>

      <div className="border-t border-border/50" />

      {/* Pace */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Team $/day</span>
          <span className="font-mono font-semibold text-accent">
            {teamDailyRate > 0 ? formatDollars(teamDailyRate) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Days to complete</span>
          <span className="font-mono text-foreground">
            {daysToComplete !== null ? `~${Math.ceil(daysToComplete)}` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Projected finish</span>
          <span className="font-mono text-foreground">
            {projectedFinish ? formatDate(projectedFinish) : "—"}
          </span>
        </div>
      </div>

      <div className="border-t border-border/50" />

      {/* Planned window */}
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Planned window</span>
        <span className="font-mono text-foreground">
          {formatDate(row.plannedStart)} → {formatDate(row.plannedEnd)}
        </span>
      </div>

      {/* Crew */}
      {crewMembers.length > 0 && (
        <>
          <div className="border-t border-border/50" />
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Crew</span>
            {crewMembers.map(({ name, rate, avgRate }) => (
              <div key={name} className="flex items-center justify-between text-[10px]">
                <span className="text-foreground font-medium truncate max-w-[140px]">{name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-muted-foreground">{formatDollars(rate)}/day</span>
                  {avgRate > 0 && Math.abs(avgRate - rate) > 1 && (
                    <span className="text-[9px] text-muted-foreground/60 font-mono">
                      (avg {formatDollars(avgRate)})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
