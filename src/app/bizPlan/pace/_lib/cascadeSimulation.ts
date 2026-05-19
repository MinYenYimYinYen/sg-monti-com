import { CSP, CSPOps, baseCountSizePrice } from "@/app/realGreen/customer/_lib/entities/types/CSPTypesAndClass";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { CascadeTimelineEvent } from "@/app/bizPlan/pace/PaceTypes";

// ---------------------------------------------------------------------------
// Shared cascade simulation kernel
//
// Extracted from cascadeSelect.ts so it can be called from both the Redux
// selector (using stored dateRange dates) and the optimizer insights popover
// (using proposed dates from effectiveResult).
// ---------------------------------------------------------------------------

export type CascadeSimEntry = {
  servCodeId: string;
  openDate: string;
  closeDate: string;
  pool: CSP;
  dailyRate: CSP;
};

export type CascadeSimResult = {
  contributed: Map<string, CSP>;
  availableFrom: Map<string, string>;
  timelineEvents: Map<string, CascadeTimelineEvent[]>;
  /**
   * The date the pool for each servCode was exhausted (remaining price hit 0).
   * Undefined when the pool was never fully drained within the simulation window.
   */
  drainDate: Map<string, string>;
  /**
   * Cumulative price drained per servCode at each boundary date.
   * Key: servCodeId → Map<boundaryDate, cumulativePriceDrained>
   * Used by the popover to display accurate "remaining" values.
   */
  contributedPriceByBoundary: Map<string, Map<string, number>>;
};

/**
 * Runs the interval-by-interval cascade simulation.
 *
 * Priority is determined by the order of `simEntries` — the first eligible
 * entry with remaining pool wins each interval. The caller is responsible for
 * ordering entries by priority before passing them in.
 *
 * Returns:
 * - `contributed`: total CSP drained per servCode
 * - `availableFrom`: first date the employee worked each servCode
 * - `timelineEvents`: ordered leave/resume events per servCode
 * - `drainDate`: date the pool hit zero per servCode
 * - `contributedPriceByBoundary`: cumulative price drained at each boundary date per servCode
 */
export function runCascadeSimulation(
  simEntries: CascadeSimEntry[],
  today: string,
): CascadeSimResult {
  const boundarySet = new Set<string>([today]);
  for (const sim of simEntries) {
    boundarySet.add(sim.openDate);
    boundarySet.add(sim.closeDate);
  }
  const boundaries = [...boundarySet].sort();

  const remaining = new Map<string, CSP>();
  for (const sim of simEntries) {
    remaining.set(sim.servCodeId, { ...sim.pool });
  }

  const contributed = new Map<string, CSP>();
  const availableFrom = new Map<string, string>();
  const timelineEvents = new Map<string, CascadeTimelineEvent[]>();
  const drainDate = new Map<string, string>();
  const contributedPriceByBoundary = new Map<string, Map<string, number>>();

  for (const sim of simEntries) {
    contributed.set(sim.servCodeId, { ...baseCountSizePrice });
    timelineEvents.set(sim.servCodeId, []);
    contributedPriceByBoundary.set(sim.servCodeId, new Map());
  }

  const wasWorking = new Map<string, boolean>();
  // Tracks which servCode was preempting a given servCode when it last stopped working.
  const lastPreemptorId = new Map<string, string | null>();

  for (let i = 0; i < boundaries.length - 1; i++) {
    const intervalStart = boundaries[i];
    const intervalEnd = boundaries[i + 1];

    const intervalWeekdays = Math.max(
      0,
      dateRanges.countWeekdays({ min: intervalStart, max: intervalEnd }) - 1,
    );
    if (intervalWeekdays <= 0) continue;

    // Winner: first eligible servCode in priority order with remaining pool.
    let winnerId: string | null = null;
    for (const sim of simEntries) {
      if (sim.openDate > intervalStart || sim.closeDate < intervalEnd) continue;
      const rem = remaining.get(sim.servCodeId)!;
      if (rem.count <= 0 && rem.size <= 0 && rem.price <= 0 && rem.rev <= 0) continue;
      winnerId = sim.servCodeId;
      break;
    }

    // Drain the winner.
    if (winnerId !== null) {
      const sim = simEntries.find((s) => s.servCodeId === winnerId)!;
      const rem = remaining.get(winnerId)!;

      if (!availableFrom.has(winnerId)) {
        availableFrom.set(winnerId, intervalStart);
      }

      const drained: CSP = {
        count: Math.min(sim.dailyRate.count * intervalWeekdays, rem.count),
        size: Math.min(sim.dailyRate.size * intervalWeekdays, rem.size),
        price: Math.min(sim.dailyRate.price * intervalWeekdays, rem.price),
        rev: Math.min(sim.dailyRate.rev * intervalWeekdays, rem.rev),
      };

      const newContributed = CSPOps.sum(contributed.get(winnerId)!, drained);
      contributed.set(winnerId, newContributed);

      const newRemaining = {
        count: Math.max(0, rem.count - drained.count),
        size: Math.max(0, rem.size - drained.size),
        price: Math.max(0, rem.price - drained.price),
        rev: Math.max(0, rem.rev - drained.rev),
      };
      remaining.set(winnerId, newRemaining);

      // Record drain date: when price first hits zero, compute the exact date within the interval.
      if (!drainDate.has(winnerId) && newRemaining.price <= 0 && sim.dailyRate.price > 0) {
        const daysToExhaust = rem.price / sim.dailyRate.price;
        drainDate.set(winnerId, dateStrings.addWeekdays(intervalStart, daysToExhaust));
      }
    }

    // Record cumulative contributed price at this boundary for all servCodes.
    for (const sim of simEntries) {
      const byBoundary = contributedPriceByBoundary.get(sim.servCodeId)!;
      byBoundary.set(intervalEnd, contributed.get(sim.servCodeId)!.price);
    }

    // Observe leave/resume transitions for all eligible servCodes.
    for (const sim of simEntries) {
      if (sim.openDate > intervalStart || sim.closeDate < intervalEnd) continue;
      const rem = remaining.get(sim.servCodeId)!;
      if (rem.count <= 0 && rem.size <= 0 && rem.price <= 0 && rem.rev <= 0) continue;

      const isWorking = sim.servCodeId === winnerId;
      const hadPreviousInterval = wasWorking.has(sim.servCodeId);
      const wasPreviouslyWorking = wasWorking.get(sim.servCodeId) ?? false;

      if (hadPreviousInterval) {
        if (wasPreviouslyWorking && !isWorking) {
          lastPreemptorId.set(sim.servCodeId, winnerId);
          timelineEvents.get(sim.servCodeId)!.push({
            kind: "leave",
            date: intervalStart,
            toServCodeId: winnerId ?? sim.servCodeId,
          });
        } else if (!wasPreviouslyWorking && isWorking) {
          const fromServCodeId = lastPreemptorId.has(sim.servCodeId)
            ? (lastPreemptorId.get(sim.servCodeId) ?? null)
            : null;
          timelineEvents.get(sim.servCodeId)!.push({
            kind: "resume",
            date: intervalStart,
            fromServCodeId,
          });
        }
      }

      wasWorking.set(sim.servCodeId, isWorking);
    }
  }

  return { contributed, availableFrom, timelineEvents, drainDate, contributedPriceByBoundary };
}
