"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/style/utils";
import { EmployeePlanGroupRow } from "@/app/pace/employeePlanSelect";
import {
  formatDollars,
  formatDate,
  computeDaysLate,
} from "@/app/pace/_components/employeePlanHelpers";

export function GroupRow({ row, isFirst }: { row: EmployeePlanGroupRow; isFirst: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { breakdown } = row;

  const isPastDeadline = row.planDeadlineWeekdays <= 0;
  const daysLateGoal =
    row.hasWork && breakdown.goalDailyPrice !== null
      ? computeDaysLate(row.activePool, row.teamGoalDailyRate, row.planDeadlineWeekdays)
      : null;

  return (
    <div className={cn("border-b border-border/40 last:border-0", !isFirst && "opacity-50")}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2 py-1.5 text-left hover:bg-accent/5 transition-colors"
      >
        <div className="w-16 shrink-0 pt-0.5 flex flex-col gap-0.5">
          <span className="flex items-center gap-0.5">
            <ChevronRight
              className={`w-3 h-3 text-primary shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
            <span className="font-mono text-[10px] text-primary font-semibold truncate">
              {row.label}
            </span>
          </span>
          {row.isOverdue && (
            <span className="text-[9px] text-destructive bg-destructive/10 rounded px-1 leading-tight w-fit">
              overdue
            </span>
          )}
          {!isFirst && (
            <span className="text-[9px] text-muted-foreground bg-muted/30 rounded px-1 leading-tight w-fit">
              queued
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          {/* Goal row */}
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-muted-foreground w-7 shrink-0">goal</span>
            <span className="font-mono text-accent flex-1">
              {formatDollars(breakdown.goalDailyPrice)}
              {breakdown.goalDailyPrice !== null ? "/day" : ""}
            </span>
            {daysLateGoal !== null && (
              <span
                className={`font-mono text-[10px] font-semibold shrink-0 ${daysLateGoal > 0 ? "text-destructive" : "text-accent"}`}
              >
                {daysLateGoal > 0 ? "+" : ""}
                {daysLateGoal}d
              </span>
            )}
          </div>
          {/* Avg row */}
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-muted-foreground w-7 shrink-0">avg</span>
            <span className="font-mono text-foreground flex-1">
              {formatDollars(breakdown.avgDailyPrice)}
              {breakdown.avgDailyPrice !== null ? "/day" : ""}
            </span>
            {breakdown.avgDaysObserved > 0 && (
              <span className="text-[9px] text-muted-foreground shrink-0">
                ({breakdown.avgDaysObserved}d)
              </span>
            )}
          </div>
          {/* Required row */}
          {!isPastDeadline && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-muted-foreground w-7 shrink-0">req</span>
              <span className="font-mono text-primary flex-1">
                {formatDollars(breakdown.requiredDailyPrice)}
                {breakdown.requiredDailyPrice !== null ? "/day" : ""}
              </span>
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="font-mono text-[10px] text-muted-foreground">
            {formatDollars(row.activePool)} left
          </div>
          {row.plannedEnd && (
            <div
              className={`font-mono text-[10px] ${isPastDeadline ? "text-destructive/70" : "text-muted-foreground"}`}
            >
              {formatDate(row.plannedEnd)}
              {isPastDeadline
                ? ` (${Math.abs(row.planDeadlineWeekdays)}d past)`
                : ` (${row.planDeadlineWeekdays}d)`}
            </div>
          )}
        </div>
      </button>

      {expanded && row.members.length > 0 && (
        <div className="bg-accent/5 pl-4">
          {row.members.map((member) => (
            <div
              key={member.servCodeId}
              className="flex items-center gap-2 py-1 border-b border-border/20 last:border-0 text-[10px]"
            >
              <span className="font-mono text-muted-foreground w-12 shrink-0">
                ↳ {member.servCodeId}
              </span>
              <span
                className={`font-mono font-semibold flex-1 ${member.isOverdue ? "text-destructive" : "text-primary"}`}
              >
                {formatDollars(member.activePool)} left
              </span>
              <span className="font-mono text-muted-foreground shrink-0">
                {member.isOverdue ? "overdue" : `${member.remainingWeekdays}d`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
