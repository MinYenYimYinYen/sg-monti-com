"use client";

import { useSelector } from "react-redux";
import { seasonPlanPageSelect } from "@/app/pace/seasonPlanPageSelect";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";

export function FeasibilityBadge({ groupId }: { groupId: string }) {
  const feasibilityRows = useSelector(seasonPlanPageSelect.feasibilityRows);
  // feasibilityRows now use `id` (sequenceId or groupId+"-seq") instead of `groupId`.
  // For synthetic single-member sequences, the id is groupId + "-seq".
  const row = feasibilityRows.find((r) => r.id === groupId || r.id === groupId + "-seq");
  if (!row) return null;

  const noData = row.daysNeeded === null || row.teamGoalDailyRate === 0;
  const daysEarlyLate = row.daysEarlyLate;

  const statusIcon = noData
    ? "—"
    : row.isOverdue
      ? "❌"
      : row.isOnTrack
        ? "✅"
        : daysEarlyLate !== null && daysEarlyLate > 0
          ? "⚠️"
          : "✅";

  const statusColor = noData
    ? "text-muted-foreground/50"
    : row.isOverdue
      ? "text-destructive"
      : row.isOnTrack
        ? "text-accent"
        : "text-secondary";

  const label =
    noData
      ? ""
      : ` ${row.daysNeeded !== null ? Math.ceil(row.daysNeeded) : "?"}/${row.daysAvailable}d`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`text-[9px] font-mono font-semibold ${statusColor} hover:opacity-80`}>
          {statusIcon}
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 text-xs" align="start">
        <p className="font-semibold text-foreground mb-2 text-[11px]">Feasibility</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Pool remaining</span>
            <span className="font-mono font-semibold">
              ${Math.round(row.activePool).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Goal $/day</span>
            <span className="font-mono">
              {row.teamGoalDailyRate > 0
                ? `$${Math.round(row.teamGoalDailyRate).toLocaleString()}`
                : "—"}
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
          {daysEarlyLate !== null && (
            <div className="flex justify-between gap-4 pt-1 border-t border-border/50">
              <span className="text-muted-foreground">Early / Late</span>
              <span
                className={`font-mono font-semibold ${daysEarlyLate > 0 ? "text-destructive" : "text-accent"}`}
              >
                {daysEarlyLate > 0 ? "+" : ""}
                {Math.round(daysEarlyLate)}d
              </span>
            </div>
          )}
          {row.missingGoals.length > 0 && (
            <p className="text-[10px] text-secondary pt-1">
              ⚠ Missing goals for {row.missingGoals.length} employee
              {row.missingGoals.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
