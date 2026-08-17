"use client";

import { minutesToHoursMinutes } from "@/lib/primatives/dates/minutesToHoursMinutes";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/style/components/tooltip";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collapses a sorted list of yyyy-MM-dd dates into human-readable ranges.
 * Consecutive dates are merged: ["2026-08-04", "2026-08-05", "2026-08-07"]
 * → ["Mon 8/4 – Tue 8/5", "Thu 8/7"]
 */
function formatMissingDates(dates: string[]): string[] {
  if (dates.length === 0) return [];

  const sorted = [...dates].sort();
  const ranges: string[] = [];
  let rangeStart = sorted[0]!;
  let rangeEnd = sorted[0]!;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;

    // Check if curr is exactly one day after prev (lexicographic ISO comparison works for yyyy-MM-dd)
    const prevDate = new Date(prev);
    const currDate = new Date(curr);
    const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      rangeEnd = curr;
    } else {
      ranges.push(formatRange(rangeStart, rangeEnd));
      rangeStart = curr;
      rangeEnd = curr;
    }
  }
  ranges.push(formatRange(rangeStart, rangeEnd));
  return ranges;
}

function formatRange(start: string, end: string): string {
  const startStr = prettyDate(start, "EEE M/d", { fallback: start });
  if (start === end) return startStr;
  const endStr = prettyDate(end, "EEE M/d", { fallback: end });
  return `${startStr} – ${endStr}`;
}

// ---------------------------------------------------------------------------
// GapCell
// ---------------------------------------------------------------------------

type GapCellProps = {
  /** Gap minutes to display. null = no punch data available. */
  minutes: number | null;
  /** Dates where punch data was absent (for the tooltip). */
  missingPunchDates: string[];
  /** Total days in the aggregation (for the tooltip header). */
  daysTotal?: number;
  /**
   * When provided, renders as "X:XX avg" using minutes / gapCount.
   * Pass gapCount from RouteGaps to enable per-gap averaging.
   */
  gapCount?: number;
};

export function GapCell({ minutes, missingPunchDates, daysTotal, gapCount }: GapCellProps) {
  const hasMissing = missingPunchDates.length > 0;
  const formattedRanges = hasMissing ? formatMissingDates(missingPunchDates) : [];

  // When gapCount is provided, display the per-gap average instead of the raw total.
  const displayMinutes =
    gapCount !== undefined && gapCount > 0 && minutes !== null
      ? Math.round(minutes / gapCount)
      : minutes;

  const valueDisplay =
    displayMinutes !== null ? (
      <span className="font-mono text-xs">{minutesToHoursMinutes(displayMinutes)}</span>
    ) : (
      <span className="text-muted-foreground text-xs">—</span>
    );

  if (!hasMissing) {
    return valueDisplay;
  }

  const missingCount = missingPunchDates.length;
  const tooltipHeader =
    daysTotal !== undefined
      ? `Missing punch data (${missingCount}/${daysTotal} days):`
      : `Missing punch data (${missingCount} day${missingCount !== 1 ? "s" : ""}):`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-0.5 cursor-help">
            {valueDisplay}
            <span className="text-[10px] text-muted-foreground leading-none">*</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-48 text-left" side="top">
          <p className="font-medium mb-1">{tooltipHeader}</p>
          <ul className="space-y-0.5">
            {formattedRanges.map((range, i) => (
              <li key={i} className="text-primary-foreground/80">{range}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
