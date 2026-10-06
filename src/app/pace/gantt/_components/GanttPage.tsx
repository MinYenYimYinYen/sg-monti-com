"use client";

import { useSelector } from "react-redux";
import { ganttSelect, GanttSequenceRow } from "@/app/pace/gantt/ganttSelect";
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

const SEQUENCE_CONTAINER_BG = "bg-secondary/5";

export function GanttPage() {
  const ganttSequenceRows = useSelector(ganttSelect.ganttSequenceRows);
  const mainDate = useSelector(ganttSelect.mainDate);
  const snowDeadline = useSelector(ganttSelect.snowDeadline);
  const activeSeasonPlan = useSelector(ganttSelect.activeSeasonPlan);

  // Show all rows that have either a plan band or crawl history
  const visibleRows = ganttSequenceRows.filter(
    (r) =>
      r.crawlerDays.length > 0 ||
      (isValidDate(r.plannedStart) && isValidDate(r.plannedEnd)) ||
      r.members.some(
        (m) => m.crawlerDays.length > 0 || (isValidDate(m.plannedStart) && isValidDate(m.plannedEnd)),
      ),
  );

  if (visibleRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No season data available. Assign employees and set goals to see the Gantt chart.
      </div>
    );
  }

  // Compute chart bounds from all member crawlerDays dates + plan bands
  let chartStart = mainDate;
  let chartEnd = mainDate;

  for (const seqRow of visibleRows) {
    for (const row of seqRow.members) {
      const firstDay = row.crawlerDays[0];
      const lastDay = row.crawlerDays.at(-1);
      if (firstDay && firstDay.date < chartStart) chartStart = firstDay.date;
      if (lastDay && lastDay.date > chartEnd) chartEnd = lastDay.date;
      if (row.plannedStart && row.plannedStart < chartStart) chartStart = row.plannedStart;
      if (row.plannedEnd && row.plannedEnd > chartEnd) chartEnd = row.plannedEnd;
    }
    // Also include sequence-level plan band
    if (seqRow.plannedStart && seqRow.plannedStart < chartStart) chartStart = seqRow.plannedStart;
    if (seqRow.plannedEnd && seqRow.plannedEnd > chartEnd) chartEnd = seqRow.plannedEnd;
  }

  if (snowDeadline && snowDeadline > chartEnd) chartEnd = snowDeadline;
  chartEnd = dateStrings.addDays(chartEnd, 3);
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

  // Compute total row count for label column height
  function getRowCount(seqRow: GanttSequenceRow): number {
    if (seqRow.isSynthetic) return 1;
    // Multi-member: 1 header row + N member rows
    return 1 + seqRow.members.length;
  }

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
            {sortedRows.map((seqRow) => {
              if (seqRow.isSynthetic) {
                // Single-member: render exactly like the old standalone group row
                const member = seqRow.members[0];
                return (
                  <div
                    key={seqRow.sequenceId}
                    className="flex items-center px-2 border-b border-border/50 bg-card"
                    style={{ height: ROW_HEIGHT, marginBottom: GROUP_GAP }}
                  >
                    <span
                      className="text-xs font-semibold text-foreground truncate font-mono"
                      title={member?.memberServCodeIds.join(", ")}
                    >
                      {seqRow.label}
                    </span>
                  </div>
                );
              }
              // Multi-member sequence: header + indented member labels
              return (
                <div key={seqRow.sequenceId} className={`${SEQUENCE_CONTAINER_BG} border-b border-border/30`}>
                  {/* Sequence header label */}
                  <div
                    className="flex items-center px-2 border-b border-border/20"
                    style={{ height: ROW_HEIGHT, marginBottom: GROUP_GAP }}
                  >
                    <span className="text-[10px] font-semibold text-secondary uppercase tracking-wide truncate">
                      {seqRow.label}
                    </span>
                  </div>
                  {/* Member labels */}
                  {seqRow.members.map((member) => (
                    <div
                      key={member.groupId}
                      className="flex items-center pl-4 pr-2 border-b border-border/20"
                      style={{ height: ROW_HEIGHT, marginBottom: GROUP_GAP }}
                    >
                      <span
                        className="text-xs font-semibold text-foreground truncate font-mono"
                        title={member.memberServCodeIds.join(", ")}
                      >
                        {member.label}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
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
              {sortedRows.map((seqRow, seqIdx) => {
                if (seqRow.isSynthetic && seqRow.members[0]) {
                  // Single-member: render exactly like the old GanttGroupRow
                  return (
                    <GanttGroupRow
                      key={seqRow.sequenceId}
                      row={seqRow.members[0]}
                      mainDate={mainDate}
                      totalDays={totalDays}
                      chartStart={chartStart}
                      colorIndex={seqIdx}
                    />
                  );
                }
                // Multi-member sequence: container with stacked member bars
                const containerHeight = (ROW_HEIGHT + GROUP_GAP) * (1 + seqRow.members.length);
                return (
                  <div
                    key={seqRow.sequenceId}
                    className={`${SEQUENCE_CONTAINER_BG} border-b border-border/30`}
                    style={{ minHeight: containerHeight }}
                  >
                    {/* Sequence header row (no bar — just spacing) */}
                    <div style={{ height: ROW_HEIGHT, marginBottom: GROUP_GAP }} />
                    {/* Member bars */}
                    {seqRow.members.map((member, memberIdx) => (
                      <GanttGroupRow
                        key={member.groupId}
                        row={member}
                        mainDate={mainDate}
                        totalDays={totalDays}
                        chartStart={chartStart}
                        colorIndex={seqIdx * 10 + memberIdx}
                      />
                    ))}
                  </div>
                );
              })}
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
