"use client";

import { useSelector } from "react-redux";
import { burndownSelect } from "@/app/pace/burndown/burndownSelect";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateRow(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDollars(value: number): string {
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// GroupDetail — burndown rows for a single assignment group
// ---------------------------------------------------------------------------

type GroupDetailProps = {
  assignmentGroupId: string;
  label: string;
};

export function GroupDetail({ assignmentGroupId, label }: GroupDetailProps) {
  const rechartsData = useSelector(burndownSelect.rechartsData);

  const dateRange = rechartsData.groupDateRanges.get(assignmentGroupId);

  // Extract per-day remaining for this group, restricted to its effective date range
  const groupRows = rechartsData.rows
    .filter((row) =>
      dateRange
        ? row.date >= dateRange.effectiveStart && row.date <= dateRange.effectiveEnd
        : true,
    )
    .map((row) => {
      const remaining = row[assignmentGroupId];
      return {
        date: row.date,
        remaining: typeof remaining === "number" ? remaining : 0,
      };
    })
    .filter((r) => r.remaining > 0.01);

  const totalPool = groupRows.length > 0 ? groupRows[0].remaining : 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Selected Group</div>
        <div className="text-base font-semibold text-foreground">{label}</div>
        {dateRange && (
          <div className="text-xs text-muted-foreground">
            {formatDateRow(dateRange.effectiveStart)} → {formatDateRow(dateRange.effectiveEnd)}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Starting pool</span>
        <span className="font-semibold text-foreground tabular-nums">{formatDollars(totalPool)}</span>
      </div>

      {/* Per-day rows */}
      {groupRows.length > 0 ? (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Daily Remaining</div>
          <div className="space-y-0.5">
            {groupRows.map(({ date, remaining }) => (
              <div key={date} className="flex items-center justify-between text-xs gap-2">
                <span className="text-muted-foreground tabular-nums">{formatDateRow(date)}</span>
                <span className="text-foreground font-medium tabular-nums">
                  {formatDollars(remaining)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No remaining pool for this group.</p>
      )}
    </div>
  );
}
