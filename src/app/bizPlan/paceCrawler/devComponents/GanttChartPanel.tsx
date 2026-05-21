"use client";

import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { getWeekNumber } from "@/lib/primatives/dates/getWeek";
import { SeasonOptimizedRange } from "@/app/bizPlan/paceCrawler/PaceCrawlerTypes";
import { Button } from "@/style/components/button";
import { Zap } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LABEL_WIDTH = 120; // px — fixed left column (progCode label only)
const ROW_HEIGHT = 36; // px per progCode row (tall enough for two stacked bars)
const GROUP_GAP = 2; // px gap between progCode rows
const HEADER_HEIGHT = 40; // px — week header

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dayOffset(from: string, to: string): number {
  const n = dateRanges.calendarDaysBetween(from, to);
  return isNaN(n) ? 0 : n;
}

function formatMonthDay(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

function isValidDate(d: string): boolean {
  return !!d && d.length === 10 && !isNaN(new Date(d + "T00:00:00").getTime());
}

// Collect all Mondays in [start, end] inclusive
function getMondaysInRange(start: string, end: string): string[] {
  if (!isValidDate(start) || !isValidDate(end) || start > end) return [];
  const mondays: string[] = [];
  let current = start;
  for (let i = 0; i < 7; i++) {
    const d = new Date(current + "T00:00:00");
    if (d.getDay() === 1) break;
    current = dateStrings.addDays(current, 1);
    if (current > end) return [];
  }
  while (current <= end) {
    mondays.push(current);
    current = dateStrings.addDays(current, 7);
  }
  return mondays;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProgGroup = {
  progCodeId: string;
  rows: SeasonOptimizedRange[];
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GanttProgRow({
  group,
  totalDays,
  chartStart,
}: {
  group: ProgGroup;
  totalDays: number;
  chartStart: string;
}) {
  return (
    <div
      className="relative border-b border-border/50"
      style={{ height: ROW_HEIGHT, marginBottom: GROUP_GAP }}
    >
      {group.rows.map((row) => {
        // --- servCodeRange bar (RealGreen-assigned range) ---
        const scRangeMin = row.servCodeRange?.min;
        const scRangeMax = row.servCodeRange?.max;
        const hasServCodeRange = isValidDate(scRangeMin) && isValidDate(scRangeMax);

        const scStartDay = hasServCodeRange ? dayOffset(chartStart, scRangeMin) : 0;
        const scWidthDays = hasServCodeRange
          ? Math.max(dayOffset(scRangeMin, scRangeMax), 1)
          : 0;
        const scLeftPct = hasServCodeRange ? (scStartDay / totalDays) * 100 : 0;
        const scWidthPct = hasServCodeRange ? (scWidthDays / totalDays) * 100 : 0;

        // --- optimizedRange bar (crawler result) ---
        if (!isValidDate(row.optimizedMin) || !isValidDate(row.optimizedMax)) return null;
        const startDay = dayOffset(chartStart, row.optimizedMin);
        const widthDays = Math.max(dayOffset(row.optimizedMin, row.optimizedMax), 1);
        const leftPct = (startDay / totalDays) * 100;
        const widthPct = (widthDays / totalDays) * 100;

        const barColor = row.hasWork ? "bg-primary/30" : "bg-muted-foreground/20";

        return (
          <div key={row.servCodeId}>
            {/* servCodeRange bar — top, thin, muted */}
            {hasServCodeRange && scWidthPct > 0 && (
              <div
                className="absolute rounded-full bg-muted-foreground/15"
                style={{
                  left: `${scLeftPct}%`,
                  width: `${scWidthPct}%`,
                  height: 8,
                  top: 4,
                }}
                title={`${row.servCodeId} RG range: ${scRangeMin} → ${scRangeMax}`}
              />
            )}

            {/* optimizedRange bar — bottom, primary, with label */}
            <div
              className={`absolute top-1/2 rounded-full ${barColor}`}
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                height: 18,
                // Offset downward slightly to sit below the servCodeRange bar
                transform: "translateY(10%)",
              }}
              title={`${row.servCodeId}: ${row.optimizedMin} → ${row.optimizedMax}`}
            >
              <span className="absolute inset-0 flex items-center px-1.5 text-[10px] font-mono truncate leading-none">
                {row.servCodeId}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GanttChartPanel() {
  const seasonResult = useSelector(paceCrawlerSelect.seasonOptimizerResult);
  const today = useSelector(paceCrawlerSelect.mainDate);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);
  // Read unsaved changes so the button can reflect pending state (unused directly but
  // ensures the component re-renders when changes are staged/cleared).
  useSelector(progServSelect.unsavedServCodeChanges);
  const { updateServCode, saveServCodeChanges } = useProgServ({});

  // Build set of servCodeIds that have at least one assigned employee
  const assignedServCodeIds = new Set<string>();
  for (const plan of assignmentsByEmployeeId.values()) {
    for (const entry of plan.entries) {
      if (entry.kind === "single") {
        assignedServCodeIds.add(entry.servCodeId);
      } else {
        for (const id of entry.servCodeIds) {
          assignedServCodeIds.add(id);
        }
      }
    }
  }

  // Filter to only servCodes with assigned employees
  const filteredResult = seasonResult.filter((r) => assignedServCodeIds.has(r.servCodeId));

  // ServCodes where hasWork === true and optimized range differs from the current RG range.
  // Only these are candidates for "Apply Optimized Ranges".
  const changedRanges = filteredResult.filter(
    (r) =>
      r.hasWork &&
      isValidDate(r.optimizedMin) &&
      isValidDate(r.optimizedMax) &&
      (r.optimizedMin !== r.servCodeRange.min || r.optimizedMax !== r.servCodeRange.max),
  );

  function handleApplyOptimizedRanges() {
    for (const row of changedRanges) {
      updateServCode({
        servCodeId: row.servCodeId,
        dateRange: { min: row.optimizedMin, max: row.optimizedMax },
      });
    }
    // saveServCodeChanges reads from progServ.unsavedServCodeChanges — the updates above
    // are staged synchronously in Redux before this call resolves.
    void saveServCodeChanges();
  }

  if (filteredResult.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No season data available. Assign employees to servCodes to see the Gantt chart.
      </div>
    );
  }

  // Build chart bounds from valid dates only — include servCodeRange bounds too
  const validRows = filteredResult.filter(
    (r) => isValidDate(r.optimizedMin) && isValidDate(r.optimizedMax),
  );
  if (validRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  let chartStart = validRows[0].optimizedMin;
  let chartEnd = validRows[0].optimizedMax;
  for (const row of validRows) {
    if (row.optimizedMin < chartStart) chartStart = row.optimizedMin;
    if (row.optimizedMax > chartEnd) chartEnd = row.optimizedMax;
    // Also include servCodeRange bounds
    if (isValidDate(row.servCodeRange?.min) && row.servCodeRange.min < chartStart) {
      chartStart = row.servCodeRange.min;
    }
    if (isValidDate(row.servCodeRange?.max) && row.servCodeRange.max > chartEnd) {
      chartEnd = row.servCodeRange.max;
    }
  }
  chartEnd = dateStrings.addDays(chartEnd, 3);

  const totalDays = Math.max(dayOffset(chartStart, chartEnd), 1);

  // Group rows by progCode
  const groupMap = new Map<string, SeasonOptimizedRange[]>();
  for (const row of filteredResult) {
    const existing = groupMap.get(row.progCodeId) ?? [];
    existing.push(row);
    groupMap.set(row.progCodeId, existing);
  }

  const groups: ProgGroup[] = [];
  for (const [progCodeId, rows] of groupMap) {
    const isSequential = rows.some((r) => r.runsInSequence);
    const sorted = isSequential
      ? [...rows].sort((a, b) => a.optimizedMin.localeCompare(b.optimizedMin))
      : rows;
    groups.push({ progCodeId, rows: sorted });
  }

  const mondays = getMondaysInRange(chartStart, chartEnd);

  const todayPct =
    isValidDate(today) && today >= chartStart && today <= chartEnd
      ? (dayOffset(chartStart, today) / totalDays) * 100
      : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar — Apply Optimized Ranges button */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border bg-card">
        <Button
          size="sm"
          variant="primary"
          intensity="solid"
          disabled={changedRanges.length === 0}
          onClick={handleApplyOptimizedRanges}
        >
          <Zap className="w-3.5 h-3.5" />
          Apply Optimized Ranges
          {changedRanges.length > 0 && (
            <span className="ml-1 bg-primary-foreground/20 rounded px-1 text-[10px] font-mono">
              {changedRanges.length}
            </span>
          )}
        </Button>
        <span className="text-[10px] text-muted-foreground">
          {changedRanges.length === 0
            ? "All optimized ranges match RealGreen — nothing to apply."
            : `${changedRanges.length} servCode${changedRanges.length === 1 ? "" : "s"} with changed ranges (has-work only).`}
        </span>
      </div>

      {/* Scrollable chart area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex w-full">

          {/* Left label column — one row per progCode */}
          <div className="shrink-0 flex flex-col" style={{ width: LABEL_WIDTH }}>
            {/* Header spacer */}
            <div style={{ height: HEADER_HEIGHT }} className="border-b border-border bg-card" />

            {groups.map((group) => (
              <div
                key={group.progCodeId}
                className="flex items-center px-2 border-b border-border/50 bg-card"
                style={{ height: ROW_HEIGHT, marginBottom: GROUP_GAP }}
              >
                <span
                  className="text-xs font-semibold text-foreground truncate font-mono"
                  title={group.progCodeId}
                >
                  {group.progCodeId}
                </span>
              </div>
            ))}
          </div>

          {/* Chart area — fills remaining width */}
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
              {/* Week gridlines */}
              {mondays.map((monday) => (
                <div
                  key={monday}
                  className="absolute top-0 bottom-0 border-l border-border/30"
                  style={{ left: `${(dayOffset(chartStart, monday) / totalDays) * 100}%` }}
                />
              ))}

              {/* Today line */}
              {todayPct !== null && (
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-destructive/70 z-20"
                  style={{ left: `${todayPct}%` }}
                />
              )}

              {/* One row per progCode */}
              {groups.map((group) => (
                <GanttProgRow
                  key={group.progCodeId}
                  group={group}
                  totalDays={totalDays}
                  chartStart={chartStart}
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
          <span>RG date range</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded-full bg-primary/30" />
          <span>Optimized range (has work)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded-full bg-muted-foreground/20" />
          <span>Optimized range (no data)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0 h-3 border-l-2 border-destructive/70" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
