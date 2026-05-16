"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { ServCodePace } from "@/app/bizPlan/pace/PaceTypes";
import { cascadeSelect } from "@/app/bizPlan/pace/selectors/cascadeSelect";
import { servCodePaceSelect } from "@/app/bizPlan/pace/selectors/servCodePaceSelect";
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
// Helpers — all accept `viewDate` (the slider date) instead of hardcoding today
// ---------------------------------------------------------------------------

/**
 * Computes the crossover date — the projected date when the employee's share of
 * unfinished CSP hits 0, based on their effective daily rate.
 * Walks forward weekday-by-weekday (Mon–Fri only) from `viewDate`.
 * Returns null if there is no usable daily rate.
 */
function computeCrossoverDate(
  employeeUnfinishedCSP: CountSizePrice,
  effectiveDailyCSP: CountSizePrice,
  viewDate: string,
): string | null {
  const dailyRate = effectiveDailyCSP.count;
  if (dailyRate <= 0) return null;
  const remaining = employeeUnfinishedCSP.count;
  if (remaining <= 0) return viewDate;

  const daysNeeded = Math.ceil(remaining / dailyRate);

  // Walk forward one calendar day at a time, counting only weekdays (Mon–Fri)
  let cur = viewDate;
  let counted = 0;
  while (counted < daysNeeded) {
    cur = dateStrings.addDays(cur, 1);
    if (dateStrings.isWeekDay(cur)) counted++;
  }
  return cur;
}

/**
 * Computes the projected completion fraction at the deadline.
 *
 * completionFraction = (effectiveDailyCSP.count * daysRemaining) / employeeUnfinishedCSP.count
 *
 * Uses the effective daily rate (avg if available, otherwise expected) against the
 * employee's proportional share of remaining work.
 *
 * A value of 1.0 means exactly on track. > 1.0 means finishing early. < 1.0 means behind.
 * Returns null if there is no usable rate.
 */
function computeCompletionFraction(
  employeeUnfinishedCSP: CountSizePrice,
  effectiveDailyCSP: CountSizePrice,
  pace: ServCodePace,
  viewDate: string,
): number | null {
  const dailyRate = effectiveDailyCSP.count;
  if (dailyRate <= 0) return null;
  const remaining = employeeUnfinishedCSP.count;
  if (remaining <= 0) return Infinity; // already done

  const max = pace.servCode.dateRange.max;
  if (!max) return null;

  // countWeekdays is inclusive of both endpoints. Subtract 1 to get future days only —
  // viewDate is already underway and its production is baked into the effective rate.
  const daysRemaining = Math.max(0, dateRanges.countWeekdays({ min: viewDate, max }) - 1);
  const projectedDone = dailyRate * daysRemaining;
  return projectedDone / remaining;
}

function getPaceColor(completionFraction: number | null, paceTolerance: number): PaceColor {
  if (completionFraction === null) return "destructive"; // no usable rate
  if (completionFraction >= 1 + paceTolerance) return "primary"; // too fast — ice
  if (completionFraction >= 1 - paceTolerance) return "accent"; // on track — green
  return "destructive"; // too slow — fire
}

// ---------------------------------------------------------------------------
// Tolerance boundary date
//
// Walks forward weekday-by-weekday from `viewDate`, simulating daily production.
// Returns the first date where completionFraction exits the tolerance band.
// Returns null if it stays in band all the way to the deadline.
// ---------------------------------------------------------------------------

function computeToleranceBoundaryDate(
  employeeUnfinishedCSP: CountSizePrice,
  effectiveDailyCSP: CountSizePrice,
  pace: ServCodePace,
  paceTolerance: number,
  viewDate: string,
): { date: string; color: PaceColor } | null {
  const dailyRate = effectiveDailyCSP.count;
  if (dailyRate <= 0) return null;

  const max = pace.servCode.dateRange.max;
  if (!max) return null;

  let remaining = employeeUnfinishedCSP.count;
  if (remaining <= 0) return null;

  // Check if already out of tolerance at viewDate
  const viewFraction = computeCompletionFraction(employeeUnfinishedCSP, effectiveDailyCSP, pace, viewDate);
  const viewColor = getPaceColor(viewFraction, paceTolerance);

  if (viewColor !== "accent") {
    return { date: viewDate, color: viewColor };
  }

  // Walk forward weekday by weekday from viewDate
  let cur = viewDate;
  while (cur < max) {
    cur = dateStrings.addDays(cur, 1);
    if (!dateStrings.isWeekDay(cur)) continue; // skip weekends

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
// The bar represents weekdays only. All widths are expressed as a fraction of
// total weekdays in the date range (min → max).
//
// The bar is split at the tolerance boundary date:
//   [min ──── viewDate]       elapsed — muted green (was on track when started)
//   [viewDate ── boundary]    bright green (still on track)
//   [boundary ── max]         bright red (behind) or bright blue (ahead)
//
// If already out of tolerance at viewDate, the entire remaining portion is red/blue.
// If never out of tolerance, the whole bar is green.
// ---------------------------------------------------------------------------

type Segment = {
  widthPct: number;
  color: PaceColor;
  muted: boolean;
};

function computeSegments(
  employeeUnfinishedCSP: CountSizePrice,
  effectiveDailyCSP: CountSizePrice,
  pace: ServCodePace,
  paceTolerance: number,
  viewDate: string,
): Segment[] {
  const { min, max } = pace.servCode.dateRange;
  if (!min || !max) return [];

  const totalWeekdays = dateRanges.countWeekdays({ min, max });
  if (totalWeekdays <= 0) return [];

  // Clamp viewDate to [min, max] for percentage math
  const clampedView = dateStrings.clampDate(viewDate, min, max);
  const boundary = computeToleranceBoundaryDate(
    employeeUnfinishedCSP,
    effectiveDailyCSP,
    pace,
    paceTolerance,
    viewDate,
  );

  const segments: Segment[] = [];

  // Elapsed portion (min → viewDate): muted — historical
  const elapsedWeekdays = dateRanges.countWeekdays({ min, max: clampedView });
  const elapsedPct = (elapsedWeekdays / totalWeekdays) * 100;
  if (elapsedPct > 0.5) {
    segments.push({ widthPct: elapsedPct, color: "accent", muted: true });
  }

  if (!boundary || boundary.date <= viewDate) {
    // boundary.color is set when already out of tolerance at viewDate.
    // If boundary is null, the bar stays green all the way to deadline.
    const outColor = boundary?.color ?? "accent";
    const remainingWeekdays = dateRanges.countWeekdays({ min: clampedView, max });
    // Subtract the shared endpoint counted in both elapsed and remaining ranges
    const remainingPct = ((remainingWeekdays - 1) / totalWeekdays) * 100;
    if (remainingPct > 0.5) {
      segments.push({ widthPct: remainingPct, color: outColor, muted: false });
    }
  } else {
    // Split remaining at boundary date
    const clampedBoundary = dateStrings.clampDate(boundary.date, clampedView, max);
    const greenWeekdays = dateRanges.countWeekdays({ min: clampedView, max: clampedBoundary });
    const outWeekdays = dateRanges.countWeekdays({ min: clampedBoundary, max });
    // Each inner range double-counts the shared endpoint; subtract 1 from each
    const greenPct = ((greenWeekdays - 1) / totalWeekdays) * 100;
    const outPct = ((outWeekdays - 1) / totalWeekdays) * 100;

    if (greenPct > 0.5) {
      segments.push({ widthPct: greenPct, color: "accent", muted: false });
    }
    if (outPct > 0.5) {
      segments.push({ widthPct: outPct, color: boundary.color, muted: false });
    }
  }

  return segments;
}

function ServCodePaceDetail({
  pace,
  paceTolerance,
  effectiveDailyCSP,
  hasAvgData,
  employeeUnfinishedCSP,
  viewDate,
}: {
  pace: ServCodePace;
  paceTolerance: number;
  effectiveDailyCSP: CountSizePrice;
  hasAvgData: boolean;
  employeeUnfinishedCSP: CountSizePrice;
  viewDate: string;
}) {
  const { min, max } = pace.servCode.dateRange;
  const crossover = computeCrossoverDate(employeeUnfinishedCSP, effectiveDailyCSP, viewDate);
  const completionFraction = computeCompletionFraction(employeeUnfinishedCSP, effectiveDailyCSP, pace, viewDate);
  const forecastColor = getPaceColor(completionFraction, paceTolerance);

  const daysRemaining = max ? dateRanges.countWeekdays({ min: viewDate, max }) : 0;
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

  // Required daily pace for this employee to finish their share on time.
  // Subtract 1 from daysRemaining (inclusive endpoint) to get future days only.
  const futureDays = Math.max(1, daysRemaining - 1);
  const requiredRate = daysRemaining > 0
    ? CountSizePriceOps.divideBy(employeeUnfinishedCSP, futureDays)
    : { ...baseCountSizePrice };

  // Days early/late from crossover
  let crossoverLabel: string | null = null;
  if (crossover && max) {
    if (crossover < max) {
      const d = dateRanges.countWeekdaysBetween({ min: crossover, max });
      crossoverLabel = `${d} day${d !== 1 ? "s" : ""} early`;
    } else if (crossover === max) {
      crossoverLabel = "Exactly on deadline";
    } else {
      const d = dateRanges.countWeekdaysBetween({ min: max, max: crossover });
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

      {!hasAvgData && (
        <p className="text-[10px] text-muted-foreground italic">
          No production history — using required pace as estimate
        </p>
      )}

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
          <span className="text-muted-foreground">
            {hasAvgData ? "Current (avg)" : "Expected"}
          </span>
          <span className="font-mono text-foreground text-right">
            <Number decimals={0}>{effectiveDailyCSP.count}</Number> / day
          </span>
          <span className="text-muted-foreground">Required</span>
          <span className="font-mono text-foreground text-right">
            <Number decimals={0}>{requiredRate.count}</Number> / day
          </span>
        </div>
      </div>

      {/* Remaining work — employee's share */}
      <div className="border-t pt-2 space-y-1.5">
        <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
          Remaining work (my share)
        </p>
        <div className="flex items-center gap-3 text-xs font-mono text-foreground">
          <span className="flex items-center gap-0.5">
            <span className="font-bold">#</span>
            <Number decimals={0}>{employeeUnfinishedCSP.count}</Number>
          </span>
          <span className="flex items-center gap-0.5">
            <LandPlot className="w-3 h-3" />
            <Number decimals={0}>{employeeUnfinishedCSP.size}</Number>
          </span>
          <span className="flex items-center gap-0.5">
            <Number isMoney decimals={0}>{employeeUnfinishedCSP.price}</Number>
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
  /** Employee's required daily CSP from the cascade — used as fallback when avgDailyCSP is null. */
  expectedCSP: CountSizePrice;
  /** Employee's proportional share of the servCode's remaining work — computed by selector. */
  employeeUnfinishedCSP: CountSizePrice;
};

export function ServCodePaceBar({ servCodeId, avgDailyCSP, expectedCSP, employeeUnfinishedCSP }: ServCodePaceBarProps) {
  const [open, setOpen] = useState(false);
  const servCodePaceMap = useSelector(servCodePaceSelect.servCodePaceMap);
  const paceTolerance = useSelector(cascadeSelect.paceTolerance);
  // Use the slider date as the view anchor — the bar reflects state as of this date
  const viewDate = useSelector(cascadeSelect.mainDate);

  const pace = servCodePaceMap.get(servCodeId);
  if (!pace) return null;

  const { min, max } = pace.servCode.dateRange;
  if (!min || !max) return null;

  // When no production history exists, fall back to expectedCSP so the bar
  // shows a meaningful forecast rather than a "no data" red state.
  const hasAvgData = (avgDailyCSP?.count ?? 0) > 0;
  const effectiveDailyCSP: CountSizePrice = hasAvgData ? avgDailyCSP! : expectedCSP;

  const segments = computeSegments(employeeUnfinishedCSP, effectiveDailyCSP, pace, paceTolerance, viewDate);
  const crossover = computeCrossoverDate(employeeUnfinishedCSP, effectiveDailyCSP, viewDate);

  const totalWeekdays = dateRanges.countWeekdays({ min, max });

  const viewPct = totalWeekdays > 0
    ? Math.min(100, Math.max(0, (dateRanges.countWeekdays({ min, max: dateStrings.clampDate(viewDate, min, max) }) / totalWeekdays) * 100))
    : 0;

  const crossoverPct = crossover && totalWeekdays > 0
    ? Math.min(100, Math.max(0, (dateRanges.countWeekdays({ min, max: crossover }) / totalWeekdays) * 100))
    : null;

  // Use the last non-muted segment's color for the header/popover — the elapsed
  // (muted) first segment is always green regardless of pace status.
  const lastFutureSegment = [...segments].reverse().find((s) => !s.muted);
  const overallColor: PaceColor = lastFutureSegment?.color ?? segments[0]?.color ?? "accent";

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

            {/* View date tick (slider position) */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-background/80"
              style={{ left: `${viewPct}%` }}
            />

            {/* Crossover tick — only if meaningfully different from viewDate */}
            {crossoverPct !== null && Math.abs(crossoverPct - viewPct) > 1 && (
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
              <ServCodePaceDetail
                pace={pace}
                paceTolerance={paceTolerance}
                effectiveDailyCSP={effectiveDailyCSP}
                hasAvgData={hasAvgData}
                employeeUnfinishedCSP={employeeUnfinishedCSP}
                viewDate={viewDate}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
