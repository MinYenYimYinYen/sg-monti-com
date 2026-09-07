import { SeasonIncrease, IncreaseFlag } from "@/app/priceIncrease/_lib/PriceIncreaseTypes";

// ---------------------------------------------------------------------------
// calcSeasonCount
// ---------------------------------------------------------------------------

type CalcSeasonCountParams = {
  /** ISO date string — the date the program was sold (program.dateSold) */
  dateSold: string;
  /** The current season year (from globalSettings.season) */
  currentSeason: number;
};

/**
 * Returns how many seasons this customer has been active.
 * Season 1 = the sale season. Season 2 = first renewal.
 * Price increases begin at season 2.
 *
 * Example: sold 2023, current season 2026 → seasonCount = 4
 */
export function calcSeasonCount({ dateSold, currentSeason }: CalcSeasonCountParams): number {
  const soldYear = new Date(dateSold).getFullYear();
  return currentSeason - soldYear + 1;
}

// ---------------------------------------------------------------------------
// calcPlannedIncreasePercent
// ---------------------------------------------------------------------------

type CalcPlannedIncreasePercentParams = {
  seasonCount: number;
  seasonIncreases: SeasonIncrease[];
  /** Percentage applied each season after all SeasonIncreases entries are exhausted */
  ongoingIncrease: number;
};

/**
 * Compounds seasonal increases up to seasonCount.
 *
 * - Season 1: no increase (return 0)
 * - Seasons 2..N: apply the matching SeasonIncrease entry if it exists,
 *   otherwise apply ongoingIncrease.
 * - Returns the total cumulative compounded increase as a percentage.
 *
 * Example: seasonIncreases = [{season:2, increasePercent:5}, {season:3, increasePercent:3}]
 *   seasonCount=2 → 5%
 *   seasonCount=3 → (1.05 * 1.03 - 1) * 100 = 8.15%
 *   seasonCount=4 → (1.05 * 1.03 * 1.02 - 1) * 100 (if ongoingIncrease=2)
 */
export function calcPlannedIncreasePercent({
  seasonCount,
  seasonIncreases,
  ongoingIncrease,
}: CalcPlannedIncreasePercentParams): number {
  if (seasonCount <= 1) return 0;

  // Build a lookup map: season number → increasePercent
  const seasonMap = new Map(seasonIncreases.map((s) => [s.season, s.increasePercent]));

  let compoundFactor = 1;
  for (let season = 2; season <= seasonCount; season++) {
    const pct = seasonMap.get(season) ?? ongoingIncrease;
    compoundFactor *= 1 + pct / 100;
  }

  return (compoundFactor - 1) * 100;
}

// ---------------------------------------------------------------------------
// calcUpsellAdjustment
// ---------------------------------------------------------------------------

type CalcUpsellAdjustmentParams = {
  plannedPercent: number;
  /** Number of OTHER active programs the customer has (excluding the target program) */
  otherProgramCount: number;
  /** Minimum number of other programs required before the bonus applies */
  threshold: number;
  /** Reduction per program beyond the threshold */
  bonusPercent: number;
  /** Floor — the result will never go below this */
  minPercent: number;
};

/**
 * Reduces the planned increase for customers with multiple programs (upsell bonus).
 *
 * For each program beyond the threshold, reduce plannedPercent by bonusPercent.
 * The result is floored at minPercent.
 *
 * Example: plannedPercent=8, otherProgramCount=3, threshold=2, bonusPercent=1, minPercent=2
 *   → 1 program beyond threshold → 8 - 1 = 7%
 */
export function calcUpsellAdjustment({
  plannedPercent,
  otherProgramCount,
  threshold,
  bonusPercent,
  minPercent,
}: CalcUpsellAdjustmentParams): number {
  const programsBeyondThreshold = Math.max(0, otherProgramCount - threshold);
  const reduction = programsBeyondThreshold * bonusPercent;
  return Math.max(minPercent, plannedPercent - reduction);
}

// ---------------------------------------------------------------------------
// calcWeightedProgramIncrease
// ---------------------------------------------------------------------------

type ServiceIncreaseInput = {
  size: number;
  plannedPercent: number;
};

type CalcWeightedProgramIncreaseParams = {
  services: ServiceIncreaseInput[];
};

/**
 * Returns the size-weighted average increase percent across all services in a program.
 *
 * A service with size 100 contributes proportionally more than a service with size 8.
 * Returns 0 if there are no services or total size is 0.
 */
export function calcWeightedProgramIncrease({
  services,
}: CalcWeightedProgramIncreaseParams): number {
  const totalSize = services.reduce((sum, s) => sum + s.size, 0);
  if (totalSize === 0) return 0;

  const weightedSum = services.reduce((sum, s) => sum + s.size * s.plannedPercent, 0);
  return weightedSum / totalSize;
}

// ---------------------------------------------------------------------------
// applyIncreaseCaps
// ---------------------------------------------------------------------------

type ApplyIncreaseCapsParams = {
  percent: number;
  /** Maximum increase to apply in the current run */
  maxNow: number;
  /** Maximum cumulative increase ever applied */
  maxEver: number;
  /** How much has already been applied cumulatively to this customer */
  cumulativeIncreaseToDate: number;
};

/**
 * Applies maxIncreaseNow and maxIncreaseEver caps to a calculated increase percent.
 *
 * - maxNow cap: percent cannot exceed maxNow in this run.
 * - maxEver cap: (cumulativeIncreaseToDate + percent) cannot exceed maxEver.
 *   The remaining headroom is (maxEver - cumulativeIncreaseToDate).
 *
 * Returns the lesser of percent, maxNow, and the maxEver headroom.
 * Result is floored at 0.
 */
export function applyIncreaseCaps({
  percent,
  maxNow,
  maxEver,
  cumulativeIncreaseToDate,
}: ApplyIncreaseCapsParams): number {
  const maxEverHeadroom = Math.max(0, maxEver - cumulativeIncreaseToDate);
  return Math.max(0, Math.min(percent, maxNow, maxEverHeadroom));
}

// ---------------------------------------------------------------------------
// resolveIncreaseFlag
// ---------------------------------------------------------------------------

type ResolveIncreaseFlagParams = {
  calculatedPercent: number;
  increaseFlags: IncreaseFlag[];
  rounding: "round" | "ceil" | "floor";
};

/**
 * Finds the best matching IncreaseFlag for a calculated increase percent.
 *
 * - "round" → nearest flag by absolute distance (ties go to the higher flag)
 * - "ceil"  → next flag at or above the calculated percent
 * - "floor" → next flag at or below the calculated percent
 *
 * Returns null if increaseFlags is empty or no flag satisfies the rounding strategy.
 */
export function resolveIncreaseFlag({
  calculatedPercent,
  increaseFlags,
  rounding,
}: ResolveIncreaseFlagParams): IncreaseFlag | null {
  if (increaseFlags.length === 0) return null;

  // Sort ascending by increasePercent for consistent traversal
  const sorted = [...increaseFlags].sort((a, b) => a.increasePercent - b.increasePercent);

  if (rounding === "floor") {
    // Largest flag whose increasePercent <= calculatedPercent
    const candidates = sorted.filter((f) => f.increasePercent <= calculatedPercent);
    return candidates.length > 0 ? candidates[candidates.length - 1] : null;
  }

  if (rounding === "ceil") {
    // Smallest flag whose increasePercent >= calculatedPercent
    const candidates = sorted.filter((f) => f.increasePercent >= calculatedPercent);
    return candidates.length > 0 ? candidates[0] : null;
  }

  // "round" — nearest by absolute distance
  let best: IncreaseFlag | null = null;
  let bestDist = Infinity;
  for (const flag of sorted) {
    const dist = Math.abs(flag.increasePercent - calculatedPercent);
    if (dist < bestDist) {
      bestDist = dist;
      best = flag;
    }
  }
  return best;
}
