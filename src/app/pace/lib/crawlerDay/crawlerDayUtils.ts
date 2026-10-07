import { CrawlerDay, CrawlerDayGroup } from "@/app/pace/lib/crawlerDay/CrawlerDay";

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

function daysForSequence(days: CrawlerDay[], sequenceId: string): CrawlerDay[] {
  return days.filter((d) => d.groups.some((g) => g.sequenceId === sequenceId));
}

// ---------------------------------------------------------------------------
// Pivoting
// ---------------------------------------------------------------------------

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
// As-of-mainDate group state
// ---------------------------------------------------------------------------

function groupPoolRemainingAsOf(days: CrawlerDay[], groupId: string, mainDate: string): number {
  const present = days.find((d) => d.date === mainDate && d.phase === "present");
  if (!present) return 0;
  const group = present.groups.find((g) => g.groupId === groupId);
  return group?.poolRemaining ?? 0;
}

function groupHasWorkAsOf(days: CrawlerDay[], groupId: string, mainDate: string): boolean {
  return groupPoolRemainingAsOf(days, groupId, mainDate) > 0;
}

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

function sequenceCumulativeByDate(
  days: CrawlerDay[],
  sequenceId: string,
): Map<string, { completed: number; remaining: number; totalPool: number; percentCompleted: number }> {
  const result = new Map<string, { completed: number; remaining: number; totalPool: number; percentCompleted: number }>();

  const groupTotalPools = new Map<string, number>();
  for (const day of days) {
    for (const group of day.groups) {
      if (group.sequenceId === sequenceId && !groupTotalPools.has(group.groupId)) {
        groupTotalPools.set(group.groupId, group.totalPool);
      }
    }
  }
  const sequenceTotalPool = [...groupTotalPools.values()].reduce((sum, p) => sum + p, 0);

  const lastKnownCompletedByGroup = new Map<string, number>();

  for (const day of days) {
    const sequenceGroups = day.groups.filter((g) => g.sequenceId === sequenceId);
    if (sequenceGroups.length === 0) continue;

    for (const group of sequenceGroups) {
      lastKnownCompletedByGroup.set(group.groupId, group.poolCompletedSoFar);
    }

    let totalCompleted = 0;
    for (const completed of lastKnownCompletedByGroup.values()) {
      totalCompleted += completed;
    }

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
// Aggregation
// ---------------------------------------------------------------------------

/** Sum of poolRemaining across all groups on a single day. */
function totalRemainingOnDay(day: CrawlerDay): number {
  return day.groups.reduce((sum, g) => sum + g.poolRemaining, 0);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const CrawlerDayUtils = {
  pastDays,
  presentDay,
  futureDays,
  daysForGroup,
  daysForSequence,
  byGroup,
  bySequence,
  byEmployee,
  groupPoolRemainingAsOf,
  groupHasWorkAsOf,
  groupPaceAsOf,
  sequenceCumulativeByDate,
  totalRemainingOnDay,
};
