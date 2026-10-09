"use client";

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
import { BurndownRechartsData, BurndownSlopeLine } from "@/app/pace/burndown/burndownTypes";

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

function groupColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
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
  const { rows, groupKeys, groupLabels, mainDate, snowDeadline } = data;

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">
        No data — run the pace engine to see the burndown chart.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart
        data={rows}
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

        <Legend
          formatter={(value: string) =>
            value === "velocityRemaining" ? "Ideal velocity" : (groupLabels.get(value) ?? value)
          }
          wrapperStyle={{ fontSize: 12, cursor: "pointer" }}
          onClick={(legendItem) => {
            const dataKey = legendItem.dataKey;
            if (typeof dataKey === "string" && dataKey !== "velocityRemaining") {
              onLegendClick(dataKey);
            }
          }}
        />

        {/* Stacked bars — one per assignment group */}
        {groupKeys.map((groupId, index) => (
          <Bar
            key={groupId}
            dataKey={groupId}
            stackId="remaining"
            fill={groupColor(index)}
            fillOpacity={0.85}
            isAnimationActive={false}
            style={{ cursor: "pointer" }}
          >
            {rows.map((row) => (
              <Cell
                key={row.date}
                fill={groupColor(index)}
                fillOpacity={0.85}
                stroke={row.date === selectedDate ? "var(--color-primary)" : "transparent"}
                strokeWidth={row.date === selectedDate ? 2 : 0}
              />
            ))}
          </Bar>
        ))}

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

        {/* Actual slope line — two segments sharing a fixed pivot at mainDate. */}
        {slopeLine && (
          <>
            <ReferenceLine
              segment={[
                { x: slopeLine.startDate, y: slopeLine.startRemaining },
                { x: slopeLine.pivotDate, y: slopeLine.pivotRemaining },
              ]}
              stroke="var(--color-accent)"
              strokeWidth={2.5}
            />
            <ReferenceLine
              segment={[
                { x: slopeLine.pivotDate, y: slopeLine.pivotRemaining },
                { x: slopeLine.endDate, y: slopeLine.endRemaining },
              ]}
              stroke="var(--color-accent)"
              strokeWidth={2.5}
            />
          </>
        )}

        {/* mainDate vertical line — "as of" marker */}
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

        {/* snowDeadline vertical line — hard season end */}
        {snowDeadline && (
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
  );
}
