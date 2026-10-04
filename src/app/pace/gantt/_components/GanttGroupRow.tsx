"use client";

import { GanttRow } from "@/app/pace/ganttSelect";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { GanttBarDetail } from "@/app/pace/gantt/_components/GanttBarDetail";
import {
  ROW_HEIGHT,
  GROUP_GAP,
  GROUP_BAR_COLORS,
  dayOffset,
  isValidDate,
} from "@/app/pace/gantt/_components/ganttHelpers";

/**
 * Renders one Gantt row using poolHistory as the authoritative date range.
 *
 * The bar is split at mainDate into two segments:
 *   - Past segment (poolHistory[0].date → mainDate): solid — actual production
 *   - Future segment (mainDate → poolHistory.at(-1).date): lighter — projected trajectory
 *
 * The plan band (thin gray pill) uses plannedStart / plannedEnd from the SeasonPlan.
 *
 * Groups with no poolHistory (no goals set, engine couldn't project) show only the
 * plan band with a "missing goals" indicator.
 */
export function GanttGroupRow({
  row,
  mainDate,
  totalDays,
  chartStart,
  colorIndex,
}: {
  row: GanttRow;
  mainDate: string;
  totalDays: number;
  chartStart: string;
  colorIndex: number;
}) {
  const groupBarColor = GROUP_BAR_COLORS[colorIndex % GROUP_BAR_COLORS.length] ?? "";

  // --- Plan band ---
  const hasPlanBand = isValidDate(row.plannedStart) && isValidDate(row.plannedEnd);
  const planLeftPct = hasPlanBand
    ? (dayOffset(chartStart, row.plannedStart!) / totalDays) * 100
    : 0;
  const planWidthPct = hasPlanBand
    ? (Math.max(dayOffset(row.plannedStart!, row.plannedEnd!), 1) / totalDays) * 100
    : 0;

  // --- Pool history bar ---
  const firstSnapshot = row.poolHistory[0];
  const lastSnapshot = row.poolHistory.at(-1);
  const hasHistory = firstSnapshot !== undefined && lastSnapshot !== undefined;

  if (!hasHistory && !hasPlanBand) return null;

  // Past segment: from first snapshot to mainDate (clamped)
  const pastStart = hasHistory ? firstSnapshot.date : null;
  const pastEnd = mainDate; // always ends at today
  const hasPastBar =
    hasHistory && isValidDate(pastStart) && pastStart < mainDate;

  const pastLeftPct = hasPastBar
    ? (dayOffset(chartStart, pastStart!) / totalDays) * 100
    : 0;
  const pastWidthPct = hasPastBar
    ? (Math.max(dayOffset(pastStart!, pastEnd), 1) / totalDays) * 100
    : 0;

  // Future segment: from mainDate to last snapshot
  const futureEnd = hasHistory ? lastSnapshot.date : null;
  const hasFutureBar =
    hasHistory && isValidDate(futureEnd) && futureEnd > mainDate;

  const futureLeftPct = hasFutureBar
    ? (dayOffset(chartStart, mainDate) / totalDays) * 100
    : 0;
  const futureWidthPct = hasFutureBar
    ? (Math.max(dayOffset(mainDate, futureEnd!), 1) / totalDays) * 100
    : 0;

  // Color logic: future bar color based on on-track status
  const futureBarColor = !row.hasWork
    ? "bg-muted-foreground/20"
    : row.isOnTrack
      ? "bg-accent/35"
      : "bg-destructive/30";

  const pastBarColor = !row.hasWork ? "bg-muted-foreground/30" : "bg-accent/60";

  // If no history at all (missing goals), show a muted placeholder bar over the plan band
  const hasMissingGoals = row.missingGoals.length > 0;

  return (
    <div
      className="relative border-b border-border/50 bg-card"
      style={{ height: ROW_HEIGHT, marginBottom: GROUP_GAP }}
    >
      {/* Plan band — thin gray pill */}
      {hasPlanBand && planWidthPct > 0 && (
        <div
          className="absolute rounded-full bg-muted-foreground/15"
          style={{ left: `${planLeftPct}%`, width: `${planWidthPct}%`, height: 8, top: 4 }}
        />
      )}

      <Popover>
        <PopoverTrigger asChild>
          <button
            className="absolute inset-0 cursor-pointer"
            style={{ background: "transparent" }}
            aria-label={`${row.label} details`}
          >
            {/* Past bar segment */}
            {hasPastBar && pastWidthPct > 0 && (
              <div
                className={`absolute rounded-l-full ${pastBarColor} ${groupBarColor}`}
                style={{
                  left: `${pastLeftPct}%`,
                  width: `${pastWidthPct}%`,
                  height: 18,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            )}

            {/* Future bar segment */}
            {hasFutureBar && futureWidthPct > 0 && (
              <div
                className={`absolute rounded-r-full ${futureBarColor} ${hasPastBar ? "" : `rounded-l-full ${groupBarColor}`}`}
                style={{
                  left: `${futureLeftPct}%`,
                  width: `${futureWidthPct}%`,
                  height: 18,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            )}

            {/* Missing goals placeholder — shown when no history */}
            {!hasHistory && hasPlanBand && hasMissingGoals && (
              <div
                className="absolute rounded-full bg-secondary/20 border border-dashed border-secondary/40"
                style={{
                  left: `${planLeftPct}%`,
                  width: `${planWidthPct}%`,
                  height: 18,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            )}

            {/* Label — positioned over the bar */}
            {(hasPastBar || hasFutureBar) && (
              <span
                className="absolute text-[10px] font-mono truncate leading-none pointer-events-none text-foreground/70 px-1.5"
                style={{
                  left: `${hasPastBar ? pastLeftPct : futureLeftPct}%`,
                  top: "50%",
                  transform: "translateY(-50%)",
                  maxWidth: `${(hasPastBar ? pastWidthPct : 0) + (hasFutureBar ? futureWidthPct : 0)}%`,
                }}
              >
                {row.label}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-3 w-auto max-w-xs" side="top" align="start" sideOffset={6}>
          <GanttBarDetail row={row} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
