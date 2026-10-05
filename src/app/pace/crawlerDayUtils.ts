import { CrawlerDay, CrawlerDayGroup } from "@/app/pace/CrawlerDay";
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
};
