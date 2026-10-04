"use client";

import { useSelector } from "react-redux";
import { ganttSelect } from "@/app/pace/ganttSelect";
import { getWeekNumber } from "@/lib/primatives/dates/getWeek";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { GanttGroupRow } from "@/app/pace/gantt/_components/GanttGroupRow";
import {
  LABEL_WIDTH,
  ROW_HEIGHT,
  GROUP_GAP,
  HEADER_HEIGHT,
  dayOffset,
  formatMonthDay,
  isValidDate,
  getMondaysInRange,
} from "@/app/pace/gantt/_components/ganttHelpers";

export function GanttPage() {
  const ganttRows = useSelector(ganttSelect.ganttRows);
  const mainDate = useSelector(ganttSelect.mainDate);
  const snowDeadline = useSelector(ganttSelect.snowDeadline);
  const activeSeasonPlan = useSelector(ganttSelect.activeSeasonPlan);

  // Show all rows that have either a plan band or pool history — no longer require projected dates
  const visibleRows = ganttRows.filter(
    (r) =>
      r.poolHistory.length > 0 ||
      (isValidDate(r.plannedStart) && isValidDate(r.plannedEnd)),
  );

  if (visibleRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No season data available. Assign employees and set goals to see the Gantt chart.
      </div>
    );
  }

  // Compute chart bounds from poolHistory dates + plan bands
  let chartStart = mainDate;
  let chartEnd = mainDate;

  for (const row of visibleRows) {
    const firstSnapshot = row.poolHistory[0];
    const lastSnapshot = row.poolHistory.at(-1);

    if (firstSnapshot && firstSnapshot.date < chartStart) chartStart = firstSnapshot.date;
    if (lastSnapshot && lastSnapshot.date > chartEnd) chartEnd = lastSnapshot.date;

    // Also include plan band in bounds
    if (row.plannedStart && row.plannedStart < chartStart) chartStart = row.plannedStart;
    if (row.plannedEnd && row.plannedEnd > chartEnd) chartEnd = row.plannedEnd;
  }

  if (snowDeadline && snowDeadline > chartEnd) chartEnd = snowDeadline;
  chartEnd = dateStrings.addDays(chartEnd, 3);
  // Pad start slightly so the first bar isn't flush against the edge
  chartStart = dateStrings.addDays(chartStart, -3);

  const totalDays = Math.max(dayOffset(chartStart, chartEnd), 1);
  const mondays = getMondaysInRange(chartStart, chartEnd);

  const todayPct =
    isValidDate(mainDate) && mainDate >= chartStart && mainDate <= chartEnd
      ? (dayOffset(chartStart, mainDate) / totalDays) * 100
      : null;

  const snowPct =
    snowDeadline &&
    isValidDate(snowDeadline) &&
    snowDeadline >= chartStart &&
    snowDeadline <= chartEnd
      ? (dayOffset(chartStart, snowDeadline) / totalDays) * 100
      : null;

  const sortedRows = [...visibleRows].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border bg-card">
        {activeSeasonPlan ? (
          <span className="text-[10px] text-foreground font-semibold">
            Plan: <span className="text-primary">{activeSeasonPlan.name}</span>
            <span className="text-muted-foreground ml-2">
              ({activeSeasonPlan.year} · cascade{" "}
              {Math.round(activeSeasonPlan.cascadeThreshold * 100)}%)
            </span>
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">No active season plan.</span>
        )}
        {snowDeadline && (
          <span className="text-[10px] text-destructive font-semibold">
            ❄ Snow deadline: {snowDeadline}
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex w-full">
          {/* Label column */}
          <div className="shrink-0 flex flex-col" style={{ width: LABEL_WIDTH }}>
            <div style={{ height: HEADER_HEIGHT }} className="border-b border-border bg-card" />
            {sortedRows.map((row) => (
              <div
                key={row.groupId}
                className="flex items-center px-2 border-b border-border/50 bg-card"
                style={{ height: ROW_HEIGHT, marginBottom: GROUP_GAP }}
              >
                <span
                  className="text-xs font-semibold text-foreground truncate font-mono"
                  title={row.memberServCodeIds.join(", ")}
                >
                  {row.label}
                </span>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 min-w-0 relative">
            {/* Week header */}
            <div
              className="relative border-b border-border bg-card w-full"
              style={{ height: HEADER_HEIGHT }}
            >
              {mondays.map((monday) => {
                const leftPct = (dayOffset(chartStart, monday) / totalDays) * 100;
                return (
                  <div
                    key={monday}
                    className="absolute top-0 flex flex-col items-center"
                    style={{ left: `${leftPct}%`, transform: "translateX(-50%)" }}
                  >
                    <span className="text-[9px] font-semibold text-muted-foreground mt-1">
                      W{getWeekNumber(monday)}
                    </span>
                    <span className="text-[9px] text-muted-foreground/70">
                      {formatMonthDay(monday)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid + bars */}
            <div className="relative w-full">
              {mondays.map((monday) => (
                <div
                  key={monday}
                  className="absolute top-0 bottom-0 border-l border-border/30"
                  style={{
                    left: `${(dayOffset(chartStart, monday) / totalDays) * 100}%`,
                  }}
                />
              ))}
              {todayPct !== null && (
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-primary/70 z-20"
                  style={{ left: `${todayPct}%` }}
                />
              )}
              {snowPct !== null && (
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-destructive z-20"
                  style={{ left: `${snowPct}%` }}
                  title={`Snow deadline: ${snowDeadline}`}
                />
              )}
              {sortedRows.map((row, idx) => (
                <GanttGroupRow
                  key={row.groupId}
                  row={row}
                  mainDate={mainDate}
                  totalDays={totalDays}
                  chartStart={chartStart}
                  colorIndex={idx}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="shrink-0 border-t border-border px-3 py-1.5 flex items-center gap-4 bg-card text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2 rounded-full bg-muted-foreground/15" />
          <span>Plan window</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded-full bg-accent/60" />
          <span>Actual (past)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded-full bg-accent/35" />
          <span>On track</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded-full bg-destructive/30" />
          <span>Behind</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0 h-3 border-l-2 border-primary/70" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0 h-3 border-l-2 border-destructive" />
          <span>Snow deadline</span>
        </div>
      </div>
    </div>
  );
}
