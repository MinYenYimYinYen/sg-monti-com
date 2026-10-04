"use client";

import { useSelector } from "react-redux";
import { GanttRow } from "@/app/pace/ganttSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [, m, day] = d.split("-");
  return `${parseInt(m)}/${parseInt(day)}`;
}

export function GanttBarDetail({ row }: { row: GanttRow }) {
  const employeeMap = useSelector(employeeSelect.employeeMap);

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-foreground font-mono">{row.label}</span>
        {row.memberServCodeIds.length > 1 && (
          <span className="text-[9px] text-muted-foreground font-mono">
            {row.memberServCodeIds.join(" · ")}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 text-[10px]">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Pool remaining</span>
          <span className="font-mono font-semibold">{fmt(row.activePool)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Team goal $/day</span>
          <span className="font-mono text-accent">
            {row.teamGoalDailyRate > 0 ? fmt(row.teamGoalDailyRate) : "—"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Days needed</span>
          <span className="font-mono">
            {row.daysNeeded !== null ? Math.ceil(row.daysNeeded) : "—"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Days available</span>
          <span className="font-mono">{row.daysAvailable}</span>
        </div>
        {row.daysEarlyLate !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Early / Late</span>
            <span
              className={`font-mono font-semibold ${row.daysEarlyLate > 0 ? "text-destructive" : "text-accent"}`}
            >
              {row.daysEarlyLate > 0 ? "+" : ""}
              {Math.round(row.daysEarlyLate)}d
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-border/50" />

      <div className="flex flex-col gap-1 text-[10px]">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Planned window</span>
          <span className="font-mono">
            {fmtDate(row.plannedStart)} → {fmtDate(row.plannedEnd)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Projected finish</span>
          <span className="font-mono">{fmtDate(row.projectedEndDate)}</span>
        </div>
      </div>

      {row.missingGoals.length > 0 && (
        <>
          <div className="border-t border-border/50" />
          <div className="text-[10px] text-secondary">
            ⚠ Missing goals:{" "}
            {row.missingGoals.map((id) => employeeMap.get(id)?.name ?? id).join(", ")}
          </div>
        </>
      )}

      {row.employeeBreakdowns.length > 0 && (
        <>
          <div className="border-t border-border/50" />
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Crew</span>
            {row.employeeBreakdowns.map((bd) => {
              const emp = employeeMap.get(bd.employeeId);
              return (
                <div key={bd.employeeId} className="flex justify-between gap-4 text-[10px]">
                  <span className="text-foreground truncate max-w-[130px]">
                    {emp?.name ?? bd.employeeId}
                  </span>
                  <span className="font-mono text-muted-foreground shrink-0">
                    {bd.goalDailyPrice !== null
                      ? `$${Math.round(bd.goalDailyPrice).toLocaleString()}/day`
                      : "no goal"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
