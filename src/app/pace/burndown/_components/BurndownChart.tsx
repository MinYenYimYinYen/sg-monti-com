"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { BurndownRechartsData } from "@/app/pace/burndown/burndownTypes";

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
// Dollar formatter for Y axis and tooltip
// ---------------------------------------------------------------------------

function formatDollars(value: number): string {
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// CSS variable resolver — reads computed values so Recharts gets real colors
// ---------------------------------------------------------------------------

/**
 * Reads a CSS custom property from the document root at call time.
 * Safe to call during render in a client component — synchronous, no side effects.
 * Falls back to the provided default when running in SSR or if the var is unset.
 */
function getCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

// ---------------------------------------------------------------------------
// BurndownChart
// ---------------------------------------------------------------------------

type BurndownChartProps = {
  data: BurndownRechartsData;
};

export function BurndownChart({ data }: BurndownChartProps) {
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
      <ComposedChart data={rows} margin={{ top: 8, right: 24, bottom: 8, left: 16 }}>
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

        <Tooltip
          wrapperStyle={{ zIndex: 50 }}
          formatter={(value, name) => [
            formatDollars(typeof value === "number" ? value : 0),
            typeof name === "string"
              ? name === "velocityRemaining"
                ? "Ideal velocity"
                : (groupLabels.get(name) ?? name)
              : String(name),
          ]}
          labelFormatter={(label) => (typeof label === "string" ? formatDateTick(label) : String(label))}
          contentStyle={{
            backgroundColor: "#2a2a2a",
            border: "1px solid #444",
            borderRadius: "6px",
            fontSize: 12,
            color: "#f0f0f0",
          }}
        />

        <Legend
          formatter={(value: string) =>
            value === "velocityRemaining" ? "Ideal velocity" : (groupLabels.get(value) ?? value)
          }
          wrapperStyle={{ fontSize: 12 }}
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
          />
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
