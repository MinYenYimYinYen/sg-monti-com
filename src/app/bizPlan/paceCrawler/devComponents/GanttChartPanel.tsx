"use client";

import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { assignmentGroupSelect } from "@/app/assignmentGroup/assignmentGroupSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { UnsavedServCodeChanges } from "@/app/realGreen/progServ/_lib/types/ProgServState";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { getWeekNumber } from "@/lib/primatives/dates/getWeek";
import { SeasonOptimizedRange } from "@/app/bizPlan/paceCrawler/PaceCrawlerTypes";
import { Button } from "@/style/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { Zap } from "lucide-react";
import {
  buildSegmentsFromTimeline,
  GanttBarDetail,
  type GanttSegment,
} from "@/app/bizPlan/paceCrawler/devComponents/GanttBarDetail";
import { AssignmentGroup } from "@/app/assignmentGroup/AssignmentGroupTypes";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LABEL_WIDTH = 120; // px — fixed left column (progCode label only)
const ROW_HEIGHT = 36; // px per progCode row (tall enough for two stacked bars)
const GROUP_GAP = 2; // px gap between progCode rows
const HEADER_HEIGHT = 40; // px — week header

// Palette for group color accents — cycles if more groups than colors.
const GROUP_BAR_COLORS = [
  "border-l-[3px] border-l-primary",
  "border-l-[3px] border-l-secondary",
  "border-l-[3px] border-l-accent",
  "border-l-[3px] border-l-destructive",
  "border-l-[3px] border-l-[oklch(0.65_0.18_300)]",
];

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
  primaryGroupLabel: string | null;
};

// ---------------------------------------------------------------------------
// Build servCodeId → groupLabel map from shared AssignmentGroup definitions.
//
// Uses the scenario-level groups from assignmentGroupSelect — all employees
// who work the same group share the same groupId, so the Gantt correctly
// renders one color per group regardless of how many employees work it.
// ---------------------------------------------------------------------------

function buildServCodeGroupMap(
  groups: AssignmentGroup[],
): Map<string, string> {
  const result = new Map<string, string>();
  for (const group of groups) {
    for (const servCodeId of group.servCodeIds) {
      if (!result.has(servCodeId)) {
        result.set(servCodeId, group.groupId);
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SegmentedBar({
  servCodeId,
  groupLabel,
  segments,
  totalDays,
  chartStart,
  barStart,
  barEnd,
  barColor,
  groupBarColor,
}: {
  servCodeId: string;
  groupLabel: string | null;
  segments: GanttSegment[];
  totalDays: number;
  chartStart: string;
  barStart: string;
  barEnd: string;
  barColor: string;
  groupBarColor: string | null;
}) {
  const startDay = dayOffset(chartStart, barStart);
  const widthDays = Math.max(dayOffset(barStart, barEnd), 1);
  const leftPct = (startDay / totalDays) * 100;
  const widthPct = (widthDays / totalDays) * 100;

  // No segments — render a plain unsegmented bar
  if (segments.length === 0) {
    return (
      <div
        className={`absolute top-1/2 rounded-full overflow-hidden ${barColor} ${groupBarColor ?? ""}`}
        style={{
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          height: 18,
          transform: "translateY(10%)",
        }}
      >
        <span className="absolute inset-0 flex items-center px-1.5 text-[10px] font-mono truncate leading-none pointer-events-none">
          {servCodeId}
        </span>
      </div>
    );
  }

  // Segmented bar — pill outer, flex segments inside
  return (
    <div
      className={`absolute top-1/2 rounded-full overflow-hidden flex ${barColor}`}
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        height: 18,
        transform: "translateY(10%)",
      }}
    >
      {/* ServCode label — absolutely positioned over the full bar */}
      <span className="absolute inset-0 flex items-center px-1.5 text-[10px] font-mono truncate leading-none pointer-events-none z-10">
        {servCodeId}
      </span>

      {segments.map((segment, idx) => {
        const segStart = segment.startDate < barStart ? barStart : segment.startDate;
        const segEnd = segment.endDate
          ? (segment.endDate > barEnd ? barEnd : segment.endDate)
          : barEnd;

        const segWidthDays = Math.max(dayOffset(segStart, segEnd), 1);
        const segWidthPct = (segWidthDays / widthDays) * 100;

        const isFirst = idx === 0;
        const isLast = idx === segments.length - 1;

        const roundingClass = isFirst && isLast
          ? "rounded-full"
          : isFirst
            ? "rounded-l-full"
            : isLast
              ? "rounded-r-full"
              : "border-l border-r border-border/40";

        const leftBorderClass = !isFirst && !(isFirst && isLast) ? "border-l border-border/40" : "";

        return (
          <Popover key={idx}>
            <PopoverTrigger asChild>
              <button
                className={`h-full cursor-pointer hover:brightness-90 transition-[filter] ${roundingClass} ${leftBorderClass} ${groupBarColor ?? ""}`}
                style={{ width: `${segWidthPct}%` }}
              />
            </PopoverTrigger>
            <PopoverContent
              className="p-3 w-auto max-w-xs"
              side="top"
              align="start"
              sideOffset={6}
            >
              <GanttBarDetail
                servCodeId={servCodeId}
                groupLabel={groupLabel}
                segment={segment}
              />
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}

function GanttProgRow({
  group,
  totalDays,
  chartStart,
  servCodeTimelineMap,
  crawlerResult,
  servCodeGroupMap,
  groupColorIndex,
}: {
  group: ProgGroup;
  totalDays: number;
  chartStart: string;
  servCodeTimelineMap: ReturnType<typeof paceCrawlerSelect.servCodeTimelineMap>;
  crawlerResult: ReturnType<typeof paceCrawlerSelect.crawlerResult>;
  servCodeGroupMap: Map<string, string>;
  groupColorIndex: Map<string, number>;
}) {
  return (
    <div
      className="relative border-b border-border/50 bg-card"
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

        const barColor = row.hasWork ? "bg-primary/30" : "bg-muted-foreground/20";

        // Per-servCode group color — look up this specific servCode's group label
        const servCodeGroupLabel = servCodeGroupMap.get(row.servCodeId) ?? null;
        const colorIdx = servCodeGroupLabel !== null ? (groupColorIndex.get(servCodeGroupLabel) ?? null) : null;
        const groupBarColor = colorIdx !== null ? (GROUP_BAR_COLORS[colorIdx % GROUP_BAR_COLORS.length] ?? null) : null;

        // Determine the timeline key: group label if grouped, servCodeId if single
        const crawledResult = crawlerResult.byServCode.get(row.servCodeId);
        const timelineKey = crawledResult?.groupLabel ?? row.servCodeId;
        const timelineEvents = servCodeTimelineMap.get(timelineKey) ?? [];

        const segments = buildSegmentsFromTimeline(
          timelineEvents,
          row.optimizedMin,
          row.optimizedMax,
        );

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

            {/* Segmented optimizedRange bar */}
            <SegmentedBar
              servCodeId={row.servCodeId}
              groupLabel={crawledResult?.groupLabel ?? null}
              segments={segments}
              totalDays={totalDays}
              chartStart={chartStart}
              barStart={row.optimizedMin}
              barEnd={row.optimizedMax}
              barColor={barColor}
              groupBarColor={groupBarColor}
            />
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
  const groups = useSelector(assignmentGroupSelect.groups);
  const groupMap = useSelector(assignmentGroupSelect.groupMap);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);
  const crawlerResult = useSelector(paceCrawlerSelect.crawlerResult);
  const servCodeTimelineMap = useSelector(paceCrawlerSelect.servCodeTimelineMap);
  useSelector(progServSelect.unsavedServCodeChanges);
  const servCodeDocMap = useSelector(progServSelect.servCodeDocMap);
  const { updateServCode, saveServCodeChanges } = useProgServ({});

  // Build set of servCodeIds that have at least one assigned employee.
  // Covers three sources:
  // 1. Shared groups (new-format group entries reference these by groupId)
  // 2. Single entries in assignment plans
  // 3. Old-format inline group entries (servCodeIds directly on the entry)
  const assignedServCodeIds = new Set<string>();
  for (const group of groups) {
    for (const id of group.servCodeIds) {
      assignedServCodeIds.add(id);
    }
  }
  for (const [, plan] of assignmentsByEmployeeId) {
    for (const entry of plan.entries) {
      if (entry.kind === "single") {
        assignedServCodeIds.add(entry.servCodeId);
      } else if (entry.groupId) {
        // New-format: resolve via groupMap
        const resolvedGroup = groupMap.get(entry.groupId);
        if (resolvedGroup) {
          for (const id of resolvedGroup.servCodeIds) assignedServCodeIds.add(id);
        }
      } else if (entry.servCodeIds) {
        // Old-format: inline servCodeIds
        for (const id of entry.servCodeIds) assignedServCodeIds.add(id);
      }
    }
  }

  // Filter to only servCodes with assigned employees
  const filteredResult = seasonResult.filter((r) => assignedServCodeIds.has(r.servCodeId));

  // ServCodes where hasWork === true and optimized range differs from the current RG range.
  const changedRanges = filteredResult.filter(
    (r) =>
      r.hasWork &&
      isValidDate(r.optimizedMin) &&
      isValidDate(r.optimizedMax) &&
      (r.optimizedMin !== r.servCodeRange.min || r.optimizedMax !== r.servCodeRange.max),
  );

  function handleApplyOptimizedRanges() {
    const unsavedChanges: UnsavedServCodeChanges[] = changedRanges.flatMap((row) => {
      const doc = servCodeDocMap.get(row.servCodeId);
      if (!doc) return [];
      return [
        {
          original: {
            servCodeId: doc.servCodeId,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            dateRange: doc.dateRange,
            alwaysAsap: doc.alwaysAsap,
            productRuleDocs: doc.productRuleDocs,
            callAheadTag: doc.callAheadTag ?? null,
            paddingDays: doc.paddingDays,
          },
          updated: {
            servCodeId: doc.servCodeId,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            dateRange: { min: row.optimizedMin, max: row.optimizedMax },
            alwaysAsap: doc.alwaysAsap,
            productRuleDocs: doc.productRuleDocs,
            callAheadTag: doc.callAheadTag ?? null,
            paddingDays: doc.paddingDays,
          },
        },
      ];
    });

    for (const row of changedRanges) {
      updateServCode({
        servCodeId: row.servCodeId,
        dateRange: { min: row.optimizedMin, max: row.optimizedMax },
      });
    }

    void saveServCodeChanges(unsavedChanges);
  }

  if (filteredResult.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No season data available. Assign employees to servCodes to see the Gantt chart.
      </div>
    );
  }

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
    if (isValidDate(row.servCodeRange?.min) && row.servCodeRange.min < chartStart) {
      chartStart = row.servCodeRange.min;
    }
    if (isValidDate(row.servCodeRange?.max) && row.servCodeRange.max > chartEnd) {
      chartEnd = row.servCodeRange.max;
    }
  }
  chartEnd = dateStrings.addDays(chartEnd, 3);

  const totalDays = Math.max(dayOffset(chartStart, chartEnd), 1);

  // ---------------------------------------------------------------------------
  // Build servCodeId → groupLabel map from shared AssignmentGroup definitions.
  // Assign a stable color index to each unique group label.
  // ---------------------------------------------------------------------------
  const servCodeGroupMap = buildServCodeGroupMap(groups);

  const groupColorIndex = new Map<string, number>();
  let nextColorIndex = 0;
  for (const row of filteredResult) {
    const groupLabel = servCodeGroupMap.get(row.servCodeId) ?? null;
    if (groupLabel !== null && !groupColorIndex.has(groupLabel)) {
      groupColorIndex.set(groupLabel, nextColorIndex++);
    }
  }

  // ---------------------------------------------------------------------------
  // Group rows by progCode, then sort so grouped servCodes appear adjacent.
  // ---------------------------------------------------------------------------
  const progCodeRowMap = new Map<string, SeasonOptimizedRange[]>();
  for (const row of filteredResult) {
    const existing = progCodeRowMap.get(row.progCodeId) ?? [];
    existing.push(row);
    progCodeRowMap.set(row.progCodeId, existing);
  }

  function getPrimaryGroupLabel(rows: SeasonOptimizedRange[]): string | null {
    for (const row of rows) {
      const label = servCodeGroupMap.get(row.servCodeId);
      if (label) return label;
    }
    return null;
  }

  const rawGroups: ProgGroup[] = [];
  for (const [progCodeId, rows] of progCodeRowMap) {
    const isSequential = rows.some((r) => r.runsInSequence);
    const sorted = isSequential
      ? [...rows].sort((a, b) => a.optimizedMin.localeCompare(b.optimizedMin))
      : rows;
    const primaryGroupLabel = getPrimaryGroupLabel(sorted);
    rawGroups.push({ progCodeId, rows: sorted, primaryGroupLabel });
  }

  const progGroups = [...rawGroups].sort((a, b) => {
    if (a.primaryGroupLabel !== null && b.primaryGroupLabel !== null) {
      return a.primaryGroupLabel.localeCompare(b.primaryGroupLabel);
    }
    if (a.primaryGroupLabel !== null) return -1;
    if (b.primaryGroupLabel !== null) return 1;
    return a.progCodeId.localeCompare(b.progCodeId);
  });

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

            {progGroups.map((group) => (
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
              {progGroups.map((group) => (
                <GanttProgRow
                  key={group.progCodeId}
                  group={group}
                  totalDays={totalDays}
                  chartStart={chartStart}
                  servCodeTimelineMap={servCodeTimelineMap}
                  crawlerResult={crawlerResult}
                  servCodeGroupMap={servCodeGroupMap}
                  groupColorIndex={groupColorIndex}
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
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3 bg-primary/30 border-l-[3px] border-l-primary rounded-sm" />
          <span>Grouped servCodes (left stripe = same group)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary/30 border-l border-border/40" />
          <span>Click segment for crew detail</span>
        </div>
      </div>
    </div>
  );
}
