"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { BurndownRechartsData, BurndownSlopeLine } from "@/app/pace/burndown/burndownTypes";
import { burndownSelect } from "@/app/pace/burndown/burndownSelect";
import { burndownActions } from "@/app/pace/burndown/burndownSlice";

// ---------------------------------------------------------------------------
// Color palette — cycles through CSS chart variables
// ---------------------------------------------------------------------------

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/**
 * Builds a Map<groupId, color> by assigning one color per unique sequence.
 * Groups with the same sequenceId share a color. Standalone groups (sequenceId=null)
 * get their own color slot, but only from indices not already claimed by a sequence.
 *
 * Two-pass approach:
 *   1. Assign color indices to all unique sequences first.
 *   2. Assign remaining indices to standalone groups.
 */
function buildGroupColorMap(
  groupKeys: string[],
  groupSequenceIds: Map<string, string | null>,
): Map<string, string> {
  // Pass 1: collect unique sequences in encounter order and assign color indices
  const sequenceColorIndex = new Map<string, number>();
  let nextColorIndex = 0;
  for (const groupId of groupKeys) {
    const sequenceId = groupSequenceIds.get(groupId) ?? null;
    if (sequenceId !== null && !sequenceColorIndex.has(sequenceId)) {
      sequenceColorIndex.set(sequenceId, nextColorIndex++);
    }
  }

  // Pass 2: assign colors — sequences use their reserved index, standalones get the next available
  const colorMap = new Map<string, string>();
  for (const groupId of groupKeys) {
    const sequenceId = groupSequenceIds.get(groupId) ?? null;
    if (sequenceId !== null) {
      colorMap.set(groupId, chartColor(sequenceColorIndex.get(sequenceId)!));
    } else {
      colorMap.set(groupId, chartColor(nextColorIndex++));
    }
  }

  return colorMap;
}

// ---------------------------------------------------------------------------
// Axis tick formatter — show abbreviated date (e.g. "Apr 3")
// ---------------------------------------------------------------------------

function formatDateTick(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Dollar formatter for Y axis
// ---------------------------------------------------------------------------

function formatDollars(value: number): string {
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// DateRangeSlider — Radix dual-thumb range slider for windowing the X axis
// ---------------------------------------------------------------------------

type DateRangeSliderProps = {
  max: number;
  startIndex: number;
  endIndex: number;
  rows: { date: string }[];
  onChange: (range: [number, number]) => void;
};

function DateRangeSlider({ max, startIndex, endIndex, rows, onChange }: DateRangeSliderProps) {
  const startLabel = rows[startIndex] ? formatDateTick(rows[startIndex].date) : "";
  const endLabel = rows[endIndex] ? formatDateTick(rows[endIndex].date) : "";

  return (
    <div className="px-2 pt-3 pb-1 space-y-1">
      {/* Date range labels */}
      <div className="flex justify-between text-xs text-muted-foreground select-none">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>

      {/* Radix range slider — natively supports two thumbs */}
      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center"
        min={0}
        max={max}
        step={1}
        value={[startIndex, endIndex]}
        onValueChange={(values) => onChange([values[0], values[1]])}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
          <SliderPrimitive.Range className="absolute h-full bg-primary/50" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
      </SliderPrimitive.Root>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slope line clipping — clamp segment endpoints to the visible date window
// ---------------------------------------------------------------------------

/**
 * Linearly interpolates the Y value at a target date between two known points.
 * Used to clip slope line segments at the visible window boundary.
 */
function interpolateY(
  targetDate: string,
  dateA: string,
  yA: number,
  dateB: string,
  yB: number,
): number {
  const tA = new Date(dateA).getTime();
  const tB = new Date(dateB).getTime();
  const tTarget = new Date(targetDate).getTime();
  if (tA === tB) return yA;
  const t = (tTarget - tA) / (tB - tA);
  return yA + t * (yB - yA);
}

type SlopeSegment = { x: string; y: number };

/**
 * Clips a slope line segment to the visible date window [windowStart, windowEnd].
 * Returns null if the segment is entirely outside the window.
 */
function clipSegment(
  a: SlopeSegment,
  b: SlopeSegment,
  windowStart: string,
  windowEnd: string,
): [SlopeSegment, SlopeSegment] | null {
  // Both endpoints outside on the same side — skip entirely
  if (a.x > windowEnd && b.x > windowEnd) return null;
  if (a.x < windowStart && b.x < windowStart) return null;

  let clippedA = a;
  let clippedB = b;

  if (clippedA.x < windowStart) {
    clippedA = {
      x: windowStart,
      y: interpolateY(windowStart, a.x, a.y, b.x, b.y),
    };
  }
  if (clippedB.x > windowEnd) {
    clippedB = {
      x: windowEnd,
      y: interpolateY(windowEnd, a.x, a.y, b.x, b.y),
    };
  }
  if (clippedA.x > windowEnd || clippedB.x < windowStart) return null;

  return [clippedA, clippedB];
}

// ---------------------------------------------------------------------------
// Custom Legend — highlights the hovered group with a border
// ---------------------------------------------------------------------------

type CustomLegendProps = {
  payload?: Array<{ dataKey?: string; color?: string; value?: string }>;
  groupLabels: Map<string, string>;
  groupDateRanges: Map<string, { effectiveStart: string; effectiveEnd: string }>;
  hoveredGroupId: string | null;
  selectedGroupId: string | null;
  onLegendClick: (groupId: string) => void;
};

function CustomLegend({
  payload,
  groupLabels,
  groupDateRanges,
  hoveredGroupId,
  selectedGroupId,
  onLegendClick,
}: CustomLegendProps) {
  if (!payload) return null;

  // Sort legend items by effectiveStart so they appear in chronological order.
  // The "Ideal velocity" line entry (velocityRemaining) is pinned to the end.
  const sorted = [...payload].sort((a, b) => {
    const keyA = a.dataKey ?? "";
    const keyB = b.dataKey ?? "";
    if (keyA === "velocityRemaining") return 1;
    if (keyB === "velocityRemaining") return -1;
    const startA = groupDateRanges.get(keyA)?.effectiveStart ?? "";
    const startB = groupDateRanges.get(keyB)?.effectiveStart ?? "";
    return startA < startB ? -1 : startA > startB ? 1 : 0;
  });

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-xs" style={{ paddingTop: 4 }}>
      {sorted.map((entry) => {
        const dataKey = entry.dataKey ?? "";
        const isVelocity = dataKey === "velocityRemaining";
        const label = isVelocity ? "Ideal velocity" : (groupLabels.get(dataKey) ?? dataKey);
        const isHovered = hoveredGroupId === dataKey;
        const isSelected = selectedGroupId === dataKey;

        return (
          <li
            key={dataKey}
            className={[
              "flex items-center gap-1.5 px-1.5 py-0.5 rounded cursor-pointer select-none transition-all",
              isHovered || isSelected
                ? "ring-1 ring-foreground/50 bg-foreground/5"
                : "",
            ].join(" ")}
            onClick={() => {
              if (!isVelocity) onLegendClick(dataKey);
            }}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground/80">{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// BurndownChart
// ---------------------------------------------------------------------------

type BurndownChartProps = {
  data: BurndownRechartsData;
  slopeLine?: BurndownSlopeLine | null;
  selectedDate: string | null;
  selectedGroupId: string | null;
  onBarClick: (date: string) => void;
  onLegendClick: (groupId: string) => void;
};

export function BurndownChart({
  data,
  slopeLine,
  selectedDate,
  selectedGroupId,
  onBarClick,
  onLegendClick,
}: BurndownChartProps) {
  const dispatch = useAppDispatch();
  const { rows, groupKeys, groupLabels, mainDate, snowDeadline } = data;

  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

  // Window state lives in Redux so it survives dataset re-renders
  const visibleRows = useSelector(burndownSelect.visibleRows);
  const { startIndex, endIndex } = useSelector(burndownSelect.dateWindowIndices);

  const maxIndex = Math.max(0, rows.length - 1);

  function handleWindowChange([start, end]: [number, number]) {
    dispatch(
      burndownActions.setDateWindow({
        start: rows[start]?.date ?? null,
        end: rows[end]?.date ?? null,
      }),
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">
        No data — run the pace engine to see the burndown chart.
      </div>
    );
  }

  const windowStart = visibleRows[0]?.date ?? "";
  const windowEnd = visibleRows[visibleRows.length - 1]?.date ?? "";

  // Clip slope line segments to the visible window so Recharts doesn't
  // extrapolate reference lines outside the chart domain.
  const clippedSlopeSegment1 =
    slopeLine
      ? clipSegment(
          { x: slopeLine.startDate, y: slopeLine.startRemaining },
          { x: slopeLine.pivotDate, y: slopeLine.pivotRemaining },
          windowStart,
          windowEnd,
        )
      : null;

  const clippedSlopeSegment2 =
    slopeLine
      ? clipSegment(
          { x: slopeLine.pivotDate, y: slopeLine.pivotRemaining },
          { x: slopeLine.endDate, y: slopeLine.endRemaining },
          windowStart,
          windowEnd,
        )
      : null;

  const groupColorMap = buildGroupColorMap(groupKeys, data.groupSequenceIds);

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={visibleRows}
          margin={{ top: 8, right: 24, bottom: 8, left: 16 }}
          onClick={(chartData) => {
            if (chartData?.activeLabel && typeof chartData.activeLabel === "string") {
              onBarClick(chartData.activeLabel);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />

          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            interval="preserveStartEnd"
          />

          <YAxis
            tickFormatter={formatDollars}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={56}
          />

          {/* Custom legend — Recharts passes LegendPayload[] which we cast to our simpler type */}
          <Legend
            content={(props) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const payload = (props.payload as any[])?.map((p: any) => ({
                dataKey: typeof p.dataKey === "string" ? p.dataKey : String(p.dataKey ?? ""),
                color: p.color as string | undefined,
                value: p.value as string | undefined,
              }));
              return (
                <CustomLegend
                  payload={payload}
                  groupLabels={groupLabels}
                  groupDateRanges={data.groupDateRanges}
                  hoveredGroupId={hoveredGroupId}
                  selectedGroupId={selectedGroupId}
                  onLegendClick={onLegendClick}
                />
              );
            }}
          />

          {/* Stacked bars — one per assignment group */}
          {groupKeys.map((groupId) => {
            const color = groupColorMap.get(groupId) ?? chartColor(0);
            const isSelected = selectedGroupId === groupId;
            const isOtherGroupSelected = selectedGroupId !== null && !isSelected;
            const dateRange = data.groupDateRanges.get(groupId);
            return (
              <Bar
                key={groupId}
                dataKey={groupId}
                stackId="remaining"
                fill={color}
                fillOpacity={isOtherGroupSelected ? 0.2 : 0.85}
                isAnimationActive={false}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredGroupId(groupId)}
                onMouseLeave={() => setHoveredGroupId(null)}
              >
                {visibleRows.map((row) => {
                  // When a group is explicitly selected, use selection opacity rules.
                  // Otherwise, dim cells that fall outside this group's active window.
                  let cellOpacity: number;
                  if (selectedGroupId !== null) {
                    cellOpacity = isOtherGroupSelected ? 0.2 : 0.85;
                  } else if (dateRange) {
                    const isActive =
                      row.date >= dateRange.effectiveStart && row.date <= dateRange.effectiveEnd;
                    cellOpacity = isActive ? 1 : 0.7;
                  } else {
                    cellOpacity = 0.85;
                  }

                  return (
                    <Cell
                      key={row.date}
                      fill={color}
                      fillOpacity={cellOpacity}
                      stroke={
                        isSelected
                          ? "white"
                          : row.date === selectedDate
                            ? "var(--color-primary)"
                            : "transparent"
                      }
                      strokeWidth={isSelected ? 1 : row.date === selectedDate ? 2 : 0}
                    />
                  );
                })}
              </Bar>
            );
          })}

          {/* Ideal velocity line */}
          <Line
            type="linear"
            dataKey="velocityRemaining"
            stroke="var(--color-destructive)"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />

          {/* Actual slope line — clipped to the visible window */}
          {clippedSlopeSegment1 && (
            <ReferenceLine
              segment={[
                { x: clippedSlopeSegment1[0].x, y: clippedSlopeSegment1[0].y },
                { x: clippedSlopeSegment1[1].x, y: clippedSlopeSegment1[1].y },
              ]}
              stroke="var(--color-accent)"
              strokeWidth={2.5}
            />
          )}
          {clippedSlopeSegment2 && (
            <ReferenceLine
              segment={[
                { x: clippedSlopeSegment2[0].x, y: clippedSlopeSegment2[0].y },
                { x: clippedSlopeSegment2[1].x, y: clippedSlopeSegment2[1].y },
              ]}
              stroke="var(--color-accent)"
              strokeWidth={2.5}
            />
          )}

          {/* mainDate vertical line — "as of" marker (only when in visible window) */}
          {mainDate >= windowStart && mainDate <= windowEnd && (
            <ReferenceLine
              x={mainDate}
              stroke="var(--color-primary)"
              strokeWidth={2}
              label={{
                value: "Today",
                position: "insideTopRight",
                fontSize: 11,
                fill: "var(--color-primary)",
              }}
            />
          )}

          {/* snowDeadline vertical line — hard season end (only when in visible window) */}
          {snowDeadline && snowDeadline >= windowStart && snowDeadline <= windowEnd && (
            <ReferenceLine
              x={snowDeadline}
              stroke="var(--color-secondary)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              label={{
                value: "Deadline",
                position: "insideTopLeft",
                fontSize: 11,
                fill: "var(--color-secondary)",
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Date range slider — only shown when there's more than one data point */}
      {rows.length > 1 && (
        <DateRangeSlider
          max={maxIndex}
          startIndex={startIndex}
          endIndex={endIndex}
          rows={rows}
          onChange={handleWindowChange}
        />
      )}
    </div>
  );
}
