import { CrawlerDay, CrawlerDayGroup } from "@/app/pace/lib/crawlerDay/CrawlerDay";
import { PoolDaySnapshot, PoolDaySnapshotEmployeeBreakdown } from "@/app/pace/PaceEngineTypes";

// ---------------------------------------------------------------------------
// CrawlerDayUtils — the canonical query interface for CrawlerDay[]
//
// All aggregation, pivoting, and filtering over crawlerDays goes here.
// Selectors and components call these methods instead of re-implementing
// crawl logic. This is the single source of truth for reading crawl output.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function pastDays(days: CrawlerDay[], mainDate: string): CrawlerDay[] {
  return days.filter((d) => d.date < mainDate);
}

function presentDay(days: CrawlerDay[], mainDate: string): CrawlerDay | undefined {
  return days.find((d) => d.date === mainDate);
}

function futureDays(days: CrawlerDay[], mainDate: string): CrawlerDay[] {
  return days.filter((d) => d.date > mainDate);
}

function daysForGroup(days: CrawlerDay[], groupId: string): CrawlerDay[] {
  return days.filter((d) => d.groups.some((g) => g.groupId === groupId));
}

/**
 * Returns all CrawlerDays where any group has the given sequenceId.
 * Synthetic single-member sequences have sequenceId === null on their group —
 * pass the groupId directly and use daysForGroup instead.
 */
function daysForSequence(days: CrawlerDay[], sequenceId: string): CrawlerDay[] {
  return days.filter((d) => d.groups.some((g) => g.sequenceId === sequenceId));
}

// ---------------------------------------------------------------------------
// Pivoting
// ---------------------------------------------------------------------------

/**
 * Returns Map<groupId, CrawlerDay[]> — only days where that group appears.
 * Each CrawlerDay in the array is the full day (all groups), not filtered.
 */
function byGroup(days: CrawlerDay[]): Map<string, CrawlerDay[]> {
  const result = new Map<string, CrawlerDay[]>();
  for (const day of days) {
    for (const group of day.groups) {
      const existing = result.get(group.groupId) ?? [];
      existing.push(day);
      result.set(group.groupId, existing);
    }
  }
  return result;
}

/**
 * Returns Map<sequenceId, CrawlerDay[]> — days where any member of the sequence appears.
 * Groups with sequenceId === null (synthetic single-member) are excluded.
 */
function bySequence(days: CrawlerDay[]): Map<string, CrawlerDay[]> {
  const result = new Map<string, CrawlerDay[]>();
  for (const day of days) {
    const seenSequences = new Set<string>();
    for (const group of day.groups) {
      if (!group.sequenceId || seenSequences.has(group.sequenceId)) continue;
      seenSequences.add(group.sequenceId);
      const existing = result.get(group.sequenceId) ?? [];
      existing.push(day);
      result.set(group.sequenceId, existing);
    }
  }
  return result;
}

/**
 * Returns Map<employeeId, { day: CrawlerDay; group: CrawlerDayGroup }[]>
 * — all days and groups an employee worked.
 */
function byEmployee(days: CrawlerDay[]): Map<string, { day: CrawlerDay; group: CrawlerDayGroup }[]> {
  const result = new Map<string, { day: CrawlerDay; group: CrawlerDayGroup }[]>();
  for (const day of days) {
    for (const group of day.groups) {
      for (const employee of group.employees) {
        const existing = result.get(employee.employeeId) ?? [];
        existing.push({ day, group });
        result.set(employee.employeeId, existing);
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Aggregation — backward-compat bridge to PoolDaySnapshot[]
// ---------------------------------------------------------------------------

/**
 * Produces a PoolDaySnapshot[] for a single group.
 * Backward-compatible bridge for consumers that still read GroupResult.poolHistory.
 * Migrate consumers to read from CrawlerDay[] directly via daysForGroup().
 */
function groupPoolHistory(days: CrawlerDay[], groupId: string): PoolDaySnapshot[] {
  const groupDays = daysForGroup(days, groupId);
  return groupDays.map((day): PoolDaySnapshot => {
    const group = day.groups.find((g) => g.groupId === groupId)!;
    const employeeBreakdowns: PoolDaySnapshotEmployeeBreakdown[] = group.employees.map((e) => ({
      employeeId: e.employeeId,
      priceCompleted: e.priceCompleted,
      priceForecasted: e.priceForecasted,
    }));
    return {
      date: day.date,
      completed: group.poolCompletedSoFar,
      remaining: group.poolRemaining,
      priceCompleted: group.priceCompleted,
      priceForecasted: group.priceForecasted,
      employeesWorking: group.employees.map((e) => e.employeeId),
      percentCompleted: group.percentCompleted,
      employeeBreakdowns,
    };
  });
}

/**
 * Produces a merged PoolDaySnapshot[] for a sequence.
 * Replaces mergePoolHistories in assembleGroupResults.
 *
 * For each day where any member of the sequence appears, sums across all
 * member groups present on that day. This correctly handles cascade transitions:
 * - Before cascade: only the predecessor group appears → its pool is the total
 * - After cascade: only the successor group appears → its pool is the total
 * - Overlap day: both appear → sums are correct
 *
 * The "completed restarts" problem is resolved because each group's
 * poolCompletedSoFar is independent — the sum reflects which groups are active.
 */
function sequencePoolHistory(days: CrawlerDay[], sequenceId: string): PoolDaySnapshot[] {
  const sequenceDays = daysForSequence(days, sequenceId);
  return sequenceDays.map((day): PoolDaySnapshot => {
    const sequenceGroups = day.groups.filter((g) => g.sequenceId === sequenceId);

    const totalCompleted = sequenceGroups.reduce((sum, g) => sum + g.poolCompletedSoFar, 0);
    const totalRemaining = sequenceGroups.reduce((sum, g) => sum + g.poolRemaining, 0);
    const totalPool = sequenceGroups.reduce((sum, g) => sum + g.totalPool, 0);
    const priceCompleted = sequenceGroups.reduce((sum, g) => sum + g.priceCompleted, 0);
    const priceForecasted = sequenceGroups.reduce((sum, g) => sum + g.priceForecasted, 0);

    const allEmployeeIds = [...new Set(sequenceGroups.flatMap((g) => g.employees.map((e) => e.employeeId)))];

    // Merge employee breakdowns across groups
    const mergedBreakdowns: PoolDaySnapshotEmployeeBreakdown[] = [];
    for (const group of sequenceGroups) {
      for (const employee of group.employees) {
        const existing = mergedBreakdowns.find((b) => b.employeeId === employee.employeeId);
        if (existing) {
          existing.priceCompleted += employee.priceCompleted;
          existing.priceForecasted += employee.priceForecasted;
        } else {
          mergedBreakdowns.push({
            employeeId: employee.employeeId,
            priceCompleted: employee.priceCompleted,
            priceForecasted: employee.priceForecasted,
          });
        }
      }
    }

    return {
      date: day.date,
      completed: totalCompleted,
      remaining: totalRemaining,
      priceCompleted,
      priceForecasted,
      employeesWorking: allEmployeeIds,
      percentCompleted: totalPool > 0 ? totalCompleted / totalPool : 0,
      employeeBreakdowns: mergedBreakdowns,
    };
  });
}

// ---------------------------------------------------------------------------
// As-of-mainDate group state (correct values, not post-simulation)
// ---------------------------------------------------------------------------

/**
 * Returns the pool remaining for a group as of mainDate.
 *
 * Reads from the present-day CrawlerDay (phase: "present") for the group.
 * This is the correct as-of-mainDate value — unlike GroupResult.activePool
 * which is drained to 0 by the future phase simulation.
 *
 * Returns 0 if no present-day snapshot exists for this group (locked successor
 * that hasn't opened yet as of mainDate).
 */
function groupPoolRemainingAsOf(days: CrawlerDay[], groupId: string, mainDate: string): number {
  const present = days.find((d) => d.date === mainDate && d.phase === "present");
  if (!present) return 0;
  const group = present.groups.find((g) => g.groupId === groupId);
  return group?.poolRemaining ?? 0;
}

/**
 * Returns true if the group has work remaining as of mainDate.
 *
 * Uses the present-day CrawlerDay poolRemaining — the correct as-of-mainDate value.
 * Unlike GroupResult.hasWork which may be false because the future phase drained the pool.
 */
function groupHasWorkAsOf(days: CrawlerDay[], groupId: string, mainDate: string): boolean {
  return groupPoolRemainingAsOf(days, groupId, mainDate) > 0;
}

/**
 * Computes the correct as-of-mainDate pace analysis for a group.
 *
 * Uses the correct poolRemaining from CrawlerDay instead of the post-simulation
 * GroupResult.activePool. Requires teamGoalDailyRate and daysAvailable from GroupResult
 * (these are not affected by the simulation).
 *
 * Returns null fields when teamGoalDailyRate is 0 (missing goals).
 */
function groupPaceAsOf(
  days: CrawlerDay[],
  groupId: string,
  mainDate: string,
  teamGoalDailyRate: number,
  daysAvailable: number,
): { poolRemaining: number; daysNeeded: number | null; daysEarlyLate: number | null; isOnTrack: boolean } {
  const poolRemaining = groupPoolRemainingAsOf(days, groupId, mainDate);
  if (teamGoalDailyRate <= 0) {
    return { poolRemaining, daysNeeded: null, daysEarlyLate: null, isOnTrack: false };
  }
  const daysNeeded = poolRemaining / teamGoalDailyRate;
  const daysEarlyLate = daysNeeded - daysAvailable;
  const isOnTrack = daysEarlyLate <= 0;
  return { poolRemaining, daysNeeded, daysEarlyLate, isOnTrack };
}

// ---------------------------------------------------------------------------
// Sequence-level cumulative aggregation
// ---------------------------------------------------------------------------

/**
 * Computes the true sequence-level cumulative state for each day in the sequence.
 *
 * The problem with summing only active groups per day: when a cascade fires and
 * LR6 opens, LR5's completed amount disappears from the sum because LR5 is no
 * longer active. This makes Completed drop and Remaining jump — visually misleading.
 *
 * The correct approach: track the "last known state" of every group in the sequence.
 * On each day, update the last-known state for any group that appears, then sum
 * across ALL groups (not just active ones) to get the true sequence total.
 *
 * Returns Map<date, { completed, remaining, totalPool, percentCompleted }>
 * where completed and remaining are monotonically correct across cascade transitions.
 */
function sequenceCumulativeByDate(
  days: CrawlerDay[],
  sequenceId: string,
): Map<string, { completed: number; remaining: number; totalPool: number; percentCompleted: number }> {
  const result = new Map<string, { completed: number; remaining: number; totalPool: number; percentCompleted: number }>();

  // Pre-scan all days to discover every group in the sequence and their totalPool.
  // totalPool is static (set at season start) — use the first occurrence per group.
  // This gives us the full sequence total pool as a fixed denominator, so that
  // Remaining and % are computed relative to the full sequence from day 1,
  // preventing jumps when new groups open at cascade transitions.
  const groupTotalPools = new Map<string, number>();
  for (const day of days) {
    for (const group of day.groups) {
      if (group.sequenceId === sequenceId && !groupTotalPools.has(group.groupId)) {
        groupTotalPools.set(group.groupId, group.totalPool);
      }
    }
  }
  const sequenceTotalPool = [...groupTotalPools.values()].reduce((sum, p) => sum + p, 0);

  // Track the last-known completed amount per group (updated as we walk days in order).
  // We only need completed — remaining and % are derived from sequenceTotalPool.
  const lastKnownCompletedByGroup = new Map<string, number>();

  for (const day of days) {
    const sequenceGroups = day.groups.filter((g) => g.sequenceId === sequenceId);
    if (sequenceGroups.length === 0) continue;

    // Update last-known completed for any group that appears today
    for (const group of sequenceGroups) {
      lastKnownCompletedByGroup.set(group.groupId, group.poolCompletedSoFar);
    }

    // Sum completed across ALL groups ever seen
    let totalCompleted = 0;
    for (const completed of lastKnownCompletedByGroup.values()) {
      totalCompleted += completed;
    }

    // Remaining and % use the fixed full-sequence total pool as denominator.
    // This ensures both are monotonically correct across cascade transitions —
    // when a new group opens, its pool was already "accounted for" in the total.
    const remaining = sequenceTotalPool - totalCompleted;
    const percentCompleted = sequenceTotalPool > 0 ? totalCompleted / sequenceTotalPool : 0;

    result.set(day.date, {
      completed: totalCompleted,
      remaining,
      totalPool: sequenceTotalPool,
      percentCompleted,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const CrawlerDayUtils = {
  // Filtering
  pastDays,
  presentDay,
  futureDays,
  daysForGroup,
  daysForSequence,

  // Pivoting
  byGroup,
  bySequence,
  byEmployee,

  // Aggregation (backward-compat bridge)
  groupPoolHistory,
  sequencePoolHistory,

  // As-of-mainDate group state (correct values, not post-simulation)
  groupPoolRemainingAsOf,
  groupHasWorkAsOf,
  groupPaceAsOf,

  // Sequence-level cumulative
  sequenceCumulativeByDate,
};
