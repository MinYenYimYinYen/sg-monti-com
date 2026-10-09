import {
  CrawlerDay,
  CrawlerDayGroup,
} from "@/app/pace/lib/crawlerDay/CrawlerDay";

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function pastDays(days: CrawlerDay[], mainDate: string): CrawlerDay[] {
  return days.filter((d) => d.date < mainDate);
}

function presentDay(
  days: CrawlerDay[],
  mainDate: string,
): CrawlerDay | undefined {
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

function byEmployee(
  days: CrawlerDay[],
): Map<string, { day: CrawlerDay; group: CrawlerDayGroup }[]> {
  const result = new Map<
    string,
    { day: CrawlerDay; group: CrawlerDayGroup }[]
  >();
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

function groupPoolRemainingAsOf(
  days: CrawlerDay[],
  groupId: string,
  mainDate: string,
): number {
  const present = days.find(
    (d) => d.date === mainDate && d.phase === "present",
  );
  if (!present) return 0;
  const group = present.groups.find((g) => g.groupId === groupId);
  return group?.poolRemaining ?? 0;
}

function groupHasWorkAsOf(
  days: CrawlerDay[],
  groupId: string,
  mainDate: string,
): boolean {
  return groupPoolRemainingAsOf(days, groupId, mainDate) > 0;
}

function groupPaceAsOf(
  days: CrawlerDay[],
  groupId: string,
  mainDate: string,
  teamGoalDailyRate: number,
  daysAvailable: number,
): {
  poolRemaining: number;
  daysNeeded: number | null;
  daysEarlyLate: number | null;
  isOnTrack: boolean;
} {
  const poolRemaining = groupPoolRemainingAsOf(days, groupId, mainDate);
  if (teamGoalDailyRate <= 0) {
    return {
      poolRemaining,
      daysNeeded: null,
      daysEarlyLate: null,
      isOnTrack: false,
    };
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
): Map<
  string,
  {
    completed: number;
    remaining: number;
    totalPool: number;
    percentCompleted: number;
  }
> {
  const result = new Map<
    string,
    {
      completed: number;
      remaining: number;
      totalPool: number;
      percentCompleted: number;
    }
  >();

  const groupTotalPools = new Map<string, number>();
  for (const day of days) {
    for (const group of day.groups) {
      if (
        group.sequenceId === sequenceId &&
        !groupTotalPools.has(group.groupId)
      ) {
        groupTotalPools.set(group.groupId, group.totalPool);
      }
    }
  }
  const sequenceTotalPool = [...groupTotalPools.values()].reduce(
    (sum, p) => sum + p,
    0,
  );

  const lastKnownCompletedByGroup = new Map<string, number>();

  for (const day of days) {
    const sequenceGroups = day.groups.filter(
      (g) => g.sequenceId === sequenceId,
    );
    if (sequenceGroups.length === 0) continue;

    for (const group of sequenceGroups) {
      lastKnownCompletedByGroup.set(group.groupId, group.poolCompletedSoFar);
    }

    let totalCompleted = 0;
    for (const completed of lastKnownCompletedByGroup.values()) {
      totalCompleted += completed;
    }

    const remaining = sequenceTotalPool - totalCompleted;
    const percentCompleted =
      sequenceTotalPool > 0 ? totalCompleted / sequenceTotalPool : 0;

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
// Burndown fill — carry forward last known remaining for all groups
// ---------------------------------------------------------------------------

/**
 * Returns a "filled" view of crawlerDays where every group that appears
 * anywhere in the timeline is present on every day, using its last known
 * poolRemaining (or totalPool before it first appears).
 *
 * This eliminates spikes caused by cascade unlocks: a group that hasn't
 * started yet contributes its full totalPool to the total remaining, so
 * the season-wide total is monotonically non-increasing.
 *
 * Output is still CrawlerDay[] — synthetic fill-in groups have priceCompleted,
 * priceForecasted, and employees zeroed/empty since they are not real activity.
 */
function fillGroupsAcrossAllDays(days: CrawlerDay[]): CrawlerDay[] {
  if (days.length === 0) return days;

  // First pass: collect every groupId and its totalPool + label + sequenceId
  // from the first day it appears.
  type GroupMeta = {
    label: string;
    sequenceId: string | null;
    totalPool: number;
  };
  const groupMeta = new Map<string, GroupMeta>();
  for (const day of days) {
    for (const group of day.groups) {
      if (!groupMeta.has(group.groupId)) {
        groupMeta.set(group.groupId, {
          label: group.label,
          sequenceId: group.sequenceId,
          totalPool: group.totalPool,
        });
      }
    }
  }

  const allGroupIds = [...groupMeta.keys()];

  // Second pass: for each day, carry forward the last known poolRemaining
  // for groups not present on that day.
  const lastKnownRemaining = new Map<string, number>();
  // Before any day, each group's remaining = its totalPool (not yet started).
  for (const [groupId, meta] of groupMeta) {
    lastKnownRemaining.set(groupId, meta.totalPool);
  }

  return days.map((day) => {
    // Update last known remaining for groups present on this day.
    for (const group of day.groups) {
      lastKnownRemaining.set(group.groupId, group.poolRemaining);
    }

    // Build the filled groups array — real groups from the day, synthetic for the rest.
    const presentGroupIds = new Set(day.groups.map((g) => g.groupId));
    const filledGroups = [...day.groups];

    for (const groupId of allGroupIds) {
      if (presentGroupIds.has(groupId)) continue;
      const meta = groupMeta.get(groupId)!;
      const remaining = lastKnownRemaining.get(groupId) ?? meta.totalPool;
      filledGroups.push({
        groupId,
        label: meta.label,
        sequenceId: meta.sequenceId,
        poolCompletedSoFar: meta.totalPool - remaining,
        poolRemaining: remaining,
        priceCompleted: 0,
        priceForecasted: 0,
        percentCompleted:
          meta.totalPool > 0
            ? (meta.totalPool - remaining) / meta.totalPool
            : 0,
        totalPool: meta.totalPool,
        cascadedToSuccessor: false,
        employees: [],
      });
    }

    return { ...day, groups: filledGroups };
  });
}

function getLastDayOfAssignmentGroup(
  groupId: string,
  days: CrawlerDay[],
): CrawlerDay | null {
  const groupMap = byGroup(days);
  const groupDays = groupMap.get(groupId);
  if (!groupDays) return null;
  return groupDays[groupDays.length - 1];
}

// ---------------------------------------------------------------------------
// Effective date ranges — first and last day a group has poolRemaining > 0
// ---------------------------------------------------------------------------

/**
 * Returns a map of groupId → { effectiveStart, effectiveEnd } derived from
 * the raw (unfilled) crawlerDays.
 *
 * effectiveStart: the first date the group appears with poolRemaining > 0.
 * effectiveEnd:   the last date the group appears with poolRemaining > 0,
 *                 EXCEPT for straggler groups — those cap at the last past-phase
 *                 day where priceCompleted > 0 (the last day they were actually
 *                 worked). This prevents the engine's forward projection from
 *                 inflating the effective range for groups that are overdue but
 *                 effectively abandoned.
 *
 * Groups that never have poolRemaining > 0 are excluded from the map.
 *
 * @param days - Raw crawlerDays (not filled).
 * @param stragglerGroupIds - Set of groupIds classified as overdue stragglers
 *   by the pace engine. Their effectiveEnd is capped at the last worked day.
 */
function getGroupEffectiveDateRanges(
  days: CrawlerDay[],
  stragglerGroupIds: Set<string> = new Set(),
): Map<string, { effectiveStart: string; effectiveEnd: string }> {
  const result = new Map<string, { effectiveStart: string; effectiveEnd: string }>();
  // Track the last past-phase day with actual production for straggler capping.
  const lastWorkedDate = new Map<string, string>();

  for (const day of days) {
    for (const group of day.groups) {
      // Track last worked date for stragglers (past-phase days with real production).
      if (stragglerGroupIds.has(group.groupId) && day.phase === "past" && group.priceCompleted > 0) {
        const current = lastWorkedDate.get(group.groupId);
        if (!current || day.date > current) {
          lastWorkedDate.set(group.groupId, day.date);
        }
      }

      if (group.poolRemaining <= 0) continue;
      const existing = result.get(group.groupId);
      if (!existing) {
        result.set(group.groupId, { effectiveStart: day.date, effectiveEnd: day.date });
      } else {
        if (day.date < existing.effectiveStart) existing.effectiveStart = day.date;
        if (day.date > existing.effectiveEnd) existing.effectiveEnd = day.date;
      }
    }
  }

  // Cap effectiveEnd for straggler groups at their last worked date.
  for (const groupId of stragglerGroupIds) {
    const range = result.get(groupId);
    if (!range) continue;
    const lastWorked = lastWorkedDate.get(groupId);
    if (lastWorked) {
      range.effectiveEnd = lastWorked;
    }
    // If no past-phase work was found, leave effectiveEnd as-is (best we can do).
  }

  return result;
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
  fillGroupsAcrossAllDays,
  getGroupEffectiveDateRanges,
};
