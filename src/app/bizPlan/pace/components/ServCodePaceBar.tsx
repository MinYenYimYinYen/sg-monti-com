"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { ServCodePace } from "@/app/bizPlan/pace/PaceType";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { employeePaceSelect } from "@/app/bizPlan/pace/employee/employeePaceSelect";
import { Number } from "@/components/Number";
import { LandPlot } from "lucide-react";
import { cn } from "@/style/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import {
  CountSizePrice,
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";

// ---------------------------------------------------------------------------
// Pace color semantics:
//   accent (green)      = on track — projected completion within tolerance of 100%
//   primary (blue)      = ahead — finishing too early, apply ice
//   destructive (red)   = behind — won't finish enough by deadline, apply fire
// ---------------------------------------------------------------------------

type PaceColor = "accent" | "primary" | "destructive";

const SEGMENT_BG: Record<PaceColor, string> = {
  accent: "bg-accent",
  primary: "bg-primary",
  destructive: "bg-destructive",
};

// Muted variants must be full static strings — Tailwind cannot scan dynamic concatenation
const SEGMENT_BG_MUTED: Record<PaceColor, string> = {
  accent: "bg-accent/50",
  primary: "bg-primary/50",
  destructive: "bg-destructive/50",
};

const SEGMENT_TEXT: Record<PaceColor, string> = {
  accent: "text-accent",
  primary: "text-primary",
  destructive: "text-destructive",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countWeekdaysBetween(from: string, to: string): number {
  if (to <= from) return 0;
  return dateRanges.countWeekdays({ min: from, max: to }) - 1;
}

/**
 * Computes the crossover date — the projected date when unfinished CSP hits 0.
 * Uses the count dimension as the primary signal.
 * Walks forward weekday-by-weekday (Mon–Fri only) from today.
 * Returns null if the team has no expected output (no lookback data).
 */
function computeCrossoverDate(pace: ServCodePace): string | null {
  const dailyRate = pace.teamExpectedCSP.count;
  if (dailyRate <= 0) return null;
  const remaining = pace.unfinishedCSP.count;
  if (remaining <= 0) return dateStrings.today();

  const daysNeeded = Math.ceil(remaining / dailyRate);

  // Walk forward one calendar day at a time, counting only weekdays (Mon–Fri)
  let cur = dateStrings.today();
  let counted = 0;
  while (counted < daysNeeded) {
    cur = dateStrings.addDays(cur, 1);
    const day = new Date(cur).getUTCDay();
    if (day !== 0 && day !== 6) counted++;
  }
  return cur;
}

/**
 * Computes the projected completion fraction at the deadline.
 *
 * completionFraction = (avgDailyCSP.count * daysRemaining) / unfinishedCSP.count
 *
 * Uses the employee's historical average pace (avgDailyCSP), not the required rate
 * (teamExpectedCSP). Using the required rate would always produce ~1.0 since it's
 * derived from unfinishedCSP / daysRemaining — circular.
 *
 * A value of 1.0 means exactly on track. > 1.0 means finishing early. < 1.0 means behind.
 * Returns null if there is no lookback data (avgDailyCSP = 0 or null).
 */
function computeCompletionFraction(
  pace: ServCodePace,
  avgDailyCSP: CountSizePrice | null,
): number | null {
  const dailyRate = avgDailyCSP?.count ?? 0;
  if (dailyRate <= 0) return null;
  const remaining = pace.unfinishedCSP.count;
  if (remaining <= 0) return Infinity; // already done

  const today = dateStrings.today();
  const max = pace.servCode.dateRange.max;
  if (!max) return null;

  const daysRemaining = dateRanges.countWeekdays({ min: today, max });
  const projectedDone = dailyRate * daysRemaining;
  return projectedDone / remaining;
}

function getPaceColor(completionFraction: number | null, paceTolerance: number): PaceColor {
  if (completionFraction === null) return "destructive"; // no data
  if (completionFraction >= 1 + paceTolerance) return "primary"; // too fast — ice
  if (completionFraction >= 1 - paceTolerance) return "accent"; // on track — green
  return "destructive"; // too slow — fire
}

// ---------------------------------------------------------------------------
// Tolerance boundary date
//
// Walks forward weekday-by-weekday from today, simulating daily production
// (avgDailyCSP.count consumed each day). At each step, recomputes:
//
//   completionFraction = avgDailyCSP.count × weekdaysRemaining(d, max) / remaining(d)
//
// Returns the first date where completionFraction exits the tolerance band
// [1 - tolerance, 1 + tolerance]. Returns null if it stays in band all the way
// to the deadline (whole remaining bar is green).
// ---------------------------------------------------------------------------

function computeToleranceBoundaryDate(
  pace: ServCodePace,
  avgDailyCSP: CountSizePrice | null,
  paceTolerance: number,
): { date: string; color: PaceColor } | null {
  const dailyRate = avgDailyCSP?.count ?? 0;
  if (dailyRate <= 0) return null;

  const max = pace.servCode.dateRange.max;
  if (!max) return null;

  let remaining = pace.unfinishedCSP.count;
  if (remaining <= 0) return null;

  const today = dateStrings.today();

  // Check if already out of tolerance today
  const todayFraction = computeCompletionFraction(pace, avgDailyCSP);
  const todayColor = getPaceColor(todayFraction, paceTolerance);
  if (todayColor !== "accent") {
    return { date: today, color: todayColor };
  }

  // Walk forward weekday by weekday
  let cur = today;
  while (cur < max) {
    cur = dateStrings.addDays(cur, 1);
    const dayOfWeek = new Date(cur).getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

    remaining = Math.max(0, remaining - dailyRate);
    if (remaining <= 0) return null; // work done before deadline — stays green

    const daysLeft = dateRanges.countWeekdays({ min: cur, max });
    const fraction = (dailyRate * daysLeft) / remaining;
    const color = getPaceColor(fraction, paceTolerance);
    if (color !== "accent") {
      return { date: cur, color };
    }
  }

  return null; // stayed green all the way to deadline
}

// ---------------------------------------------------------------------------
// Segment computation
//
// The bar is split at the tolerance boundary date:
//   [min ──── today]          elapsed — muted green (was on track when started)
//   [today ── boundaryDate]   bright green (still on track)
//   [boundaryDate ── max]     bright red (behind) or bright blue (ahead)
//
// If already out of tolerance today, the entire remaining portion is red/blue.
// If never out of tolerance, the whole bar is green.
// ---------------------------------------------------------------------------

type Segment = {
  widthPct: number;
  color: PaceColor;
  muted: boolean;
};

function computeSegments(
  pace: ServCodePace,
  paceTolerance: number,
  avgDailyCSP: CountSizePrice | null,
): Segment[] {
  const { min, max } = pace.servCode.dateRange;
  if (!min || !max) return [];

  const today = dateStrings.today();
  const minMs = new Date(min).getTime();
  const maxMs = new Date(max).getTime();
  const totalMs = maxMs - minMs;
  if (totalMs <= 0) return [];

  const todayMs = Math.min(Math.max(new Date(today).getTime(), minMs), maxMs);
  const boundary = computeToleranceBoundaryDate(pace, avgDailyCSP, paceTolerance);

  const segments: Segment[] = [];

  // Elapsed portion (min → today): muted green — historical, was on track
  const elapsedPct = ((todayMs - minMs) / totalMs) * 100;
  if (elapsedPct > 0.5) {
    segments.push({ widthPct: elapsedPct, color: "accent", muted: true });
  }

  if (!boundary || boundary.date <= today) {
    // Already out of tolerance (or no data) — entire remaining portion is the forecast color
    const outColor = boundary?.color ?? "destructive";
    const remainingPct = ((maxMs - todayMs) / totalMs) * 100;
    if (remainingPct > 0.5) {
      segments.push({ widthPct: remainingPct, color: outColor, muted: false });
    }
  } else {
    // Split remaining at boundary date
    const boundaryMs = Math.min(new Date(boundary.date).getTime(), maxMs);
    const greenPct = ((boundaryMs - todayMs) / totalMs) * 100;
    const outPct = ((maxMs - boundaryMs) / totalMs) * 100;

    if (greenPct > 0.5) {
      segments.push({ widthPct: greenPct, color: "accent", muted: false });
    }
    if (outPct > 0.5) {
      segments.push({ widthPct: outPct, color: boundary.color, muted: false });
    }
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Popover detail content
// ---------------------------------------------------------------------------

function ServCodePaceDetail({
  pace,
  paceTolerance,
  avgDailyCSP,
}: {
  pace: ServCodePace;
  paceTolerance: number;
  avgDailyCSP: CountSizePrice | null;
}) {
  const today = dateStrings.today();
  const { min, max } = pace.servCode.dateRange;
  const crossover = computeCrossoverDate(pace);
  const completionFraction = computeCompletionFraction(pace, avgDailyCSP);
  const forecastColor = getPaceColor(completionFraction, paceTolerance);

  const daysRemaining = max ? dateRanges.countWeekdays({ min: today, max }) : 0;
  const totalDays = min && max ? dateRanges.countWeekdays({ min, max }) : 0;

  let statusLabel = "Unknown";
  if (completionFraction === null) {
    statusLabel = "No data";
  } else if (completionFraction === Infinity) {
    statusLabel = "Complete";
  } else if (forecastColor === "accent") {
    statusLabel = "On track";
  } else if (forecastColor === "primary") {
    const pct = Math.round((completionFraction - 1) * 100);
    statusLabel = `${pct}% ahead`;
  } else {
    const pct = Math.round((1 - completionFraction) * 100);
    statusLabel = `${pct}% short`;
  }

  const statusTextColor = SEGMENT_TEXT[forecastColor];

  // Required daily pace to finish on time
  const requiredRate = daysRemaining > 0
    ? CountSizePriceOps.divideBy(pace.unfinishedCSP, daysRemaining)
    : { ...baseCountSizePrice };

  // avgDailyCSP drives the forecast — show it as "Current" so the user sees
  // what the employee actually does vs what's required.
  const currentRate = avgDailyCSP ?? pace.teamExpectedCSP;

  // Days early/late from crossover
  let crossoverLabel: string | null = null;
  if (crossover && max) {
    if (crossover < max) {
      const d = countWeekdaysBetween(crossover, max);
      crossoverLabel = `${d} day${d !== 1 ? "s" : ""} early`;
    } else if (crossover === max) {
      crossoverLabel = "Exactly on deadline";
    } else {
      const d = countWeekdaysBetween(max, crossover);
      crossoverLabel = `${d} day${d !== 1 ? "s" : ""} late`;
    }
  }

  return (
    <div className="space-y-3 text-sm">
      {/* Status */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">
          Forecast
        </span>
        <span className={cn("font-semibold text-sm", statusTextColor)}>
          {statusLabel}
        </span>
      </div>

      {completionFraction !== null && completionFraction !== Infinity && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Projected completion</span>
          <span className={cn("font-mono font-medium", statusTextColor)}>
            <Number decimals={0}>{completionFraction * 100}</Number>%
          </span>
        </div>
      )}

      {crossover && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Finishes</span>
          <span className="font-mono text-foreground">
            {crossover}
            {crossoverLabel && (
              <span className="ml-1 text-muted-foreground">({crossoverLabel})</span>
            )}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Deadline</span>
        <span className="font-mono text-foreground">{max ?? "—"}</span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Days remaining</span>
        <span className="font-mono text-foreground">{daysRemaining} of {totalDays}</span>
      </div>

      {/* Pace comparison */}
      <div className="border-t pt-2 space-y-1.5">
        <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
          Daily pace (count)
        </p>
        <div className="grid grid-cols-2 gap-x-4 text-xs">
          <span className="text-muted-foreground">Current</span>
          <span className="font-mono text-foreground text-right">
            <Number decimals={0}>{currentRate.count}</Number> / day
          </span>
          <span className="text-muted-foreground">Required</span>
          <span className="font-mono text-foreground text-right">
            <Number decimals={0}>{requiredRate.count}</Number> / day
          </span>
        </div>
      </div>

      {/* Remaining work */}
      <div className="border-t pt-2 space-y-1.5">
        <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
          Remaining work
        </p>
        <div className="flex items-center gap-3 text-xs font-mono text-foreground">
          <span className="flex items-center gap-0.5">
            <span className="font-bold">#</span>
            <Number decimals={0}>{pace.unfinishedCSP.count}</Number>
          </span>
          <span className="flex items-center gap-0.5">
            <LandPlot className="w-3 h-3" />
            <Number decimals={0}>{pace.unfinishedCSP.size}</Number>
          </span>
          <span className="flex items-center gap-0.5">
            <Number isMoney decimals={0}>{pace.unfinishedCSP.price}</Number>
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export — the bar + popover
// ---------------------------------------------------------------------------

type ServCodePaceBarProps = {
  servCodeId: string;
  /** Employee's historical average daily CSP for this servCode — drives the forecast color. */
  avgDailyCSP: CountSizePrice | null;
};

export function ServCodePaceBar({ servCodeId, avgDailyCSP }: ServCodePaceBarProps) {
  const [open, setOpen] = useState(false);
  const servCodePaceMap = useSelector(paceSelect.servCodePaceMap);
  const paceTolerance = useSelector(employeePaceSelect.paceTolerance);

  const pace = servCodePaceMap.get(servCodeId);
  if (!pace) return null;

  const { min, max } = pace.servCode.dateRange;
  if (!min || !max) return null;

  const today = dateStrings.today();
  const segments = computeSegments(pace, paceTolerance, avgDailyCSP);
  const crossover = computeCrossoverDate(pace);

  const minMs = new Date(min).getTime();
  const maxMs = new Date(max).getTime();
  const totalMs = maxMs - minMs;
  const todayMs = new Date(today).getTime();

  const todayPct = totalMs > 0
    ? Math.min(100, Math.max(0, ((todayMs - minMs) / totalMs) * 100))
    : 0;

  const crossoverPct = crossover && totalMs > 0
    ? Math.min(100, Math.max(0, ((new Date(crossover).getTime() - minMs) / totalMs) * 100))
    : null;

  const overallColor: PaceColor = segments[0]?.color ?? "accent";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full group"
          aria-label={`Pace details for ${servCodeId}`}
        >
          {/* Date labels */}
          <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground mb-0.5">
            <span>{min}</span>
            <span>{max}</span>
          </div>

          {/* Segmented bar */}
          <div className="relative h-2 rounded-full overflow-hidden bg-muted w-full">
            <div className="flex h-full w-full">
              {segments.map((seg, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-full transition-all",
                    seg.muted ? SEGMENT_BG_MUTED[seg.color] : SEGMENT_BG[seg.color],
                  )}
                  style={{ width: `${seg.widthPct}%` }}
                />
              ))}
            </div>

            {/* Today tick */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-background/80"
              style={{ left: `${todayPct}%` }}
            />

            {/* Crossover tick — only if meaningfully different from today */}
            {crossoverPct !== null && Math.abs(crossoverPct - todayPct) > 1 && (
              <div
                className={cn(
                  "absolute top-0 bottom-0 w-0.5",
                  overallColor === "primary" ? "bg-primary/70" : "bg-destructive/70",
                )}
                style={{ left: `${Math.min(crossoverPct, 100)}%` }}
              />
            )}
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-0" align="start">
        <div className="bg-popover">
          <div className="bg-accent/20">
            <div className={cn(
              "px-3 py-2 border-b text-xs font-semibold",
              SEGMENT_TEXT[overallColor],
            )}>
              {servCodeId}
            </div>
            <div className="px-3 py-3">
              <ServCodePaceDetail pace={pace} paceTolerance={paceTolerance} avgDailyCSP={avgDailyCSP} />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
