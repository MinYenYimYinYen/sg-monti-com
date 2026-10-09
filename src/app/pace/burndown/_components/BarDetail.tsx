"use client";

import { BurndownRechartsRow } from "@/app/pace/burndown/burndownTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateHeading(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  const startStr = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endStr = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${startStr}–${endStr}`;
}

function formatDollars(value: number): string {
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// BarDetail
// ---------------------------------------------------------------------------

type BarDetailProps = {
  row: BurndownRechartsRow;
  groupKeys: string[];
  groupLabels: Map<string, string>;
  groupDateRanges: Map<string, { effectiveStart: string; effectiveEnd: string }>;
};

export function BarDetail({ row, groupKeys, groupLabels, groupDateRanges }: BarDetailProps) {
  const groupBreakdown = groupKeys
    .map((groupId) => {
      const remaining = row[groupId];
      const dateRange = groupDateRanges.get(groupId);
      return {
        groupId,
        label: groupLabels.get(groupId) ?? groupId,
        remaining: typeof remaining === "number" ? remaining : 0,
        dateRange: dateRange ? formatDateRange(dateRange.effectiveStart, dateRange.effectiveEnd) : null,
      };
    })
    .filter((g) => g.remaining > 0);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Selected Day</div>
        <div className="text-base font-semibold text-foreground">{formatDateHeading(row.date)}</div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Total remaining</span>
        <span className="font-semibold text-foreground tabular-nums">
          {formatDollars(row.totalRemaining)}
        </span>
      </div>

      {groupBreakdown.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">By Group</div>
          <div className="space-y-1.5">
            {groupBreakdown.map(({ groupId, label, remaining, dateRange }) => (
              <div key={groupId} className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {dateRange && (
                    <span className="text-muted-foreground/70 tabular-nums shrink-0">{dateRange}</span>
                  )}
                  <span className="text-foreground/80 truncate">{label}</span>
                </div>
                <span className="text-foreground font-medium tabular-nums shrink-0">
                  {formatDollars(remaining)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {groupBreakdown.length === 0 && (
        <p className="text-xs text-muted-foreground">No remaining pool on this day.</p>
      )}
    </div>
  );
}
