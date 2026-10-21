import {
  UrgentGroup,
  PaceEngineResult,
} from "@/app/pace/lib/PaceEngineTypes";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { CrawlerDay, CrawlerDayGroup, DaysSinceAnalysis, ElapsedDaysDistribution } from "@/app/pace/lib/crawlerDay/CrawlerDay";
import { PaceEngineInputs } from "@/app/pace/lib/PaceEngineInputs";
import { FuturePhaseState } from "@/app/pace/lib/crawlFuturePhase/crawlFuturePhase";
import { PastPhaseState } from "@/app/pace/lib/crawlPastPhase/crawlPastPhase";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

export function assembleGroupResults(
  inputs: PaceEngineInputs,
  assignmentGroups: AssignmentGroup[],
  futureState: FuturePhaseState,
  pastState: PastPhaseState,
): PaceEngineResult {
  const { mainDate } = inputs;
  const { poolStates } = futureState;

  const urgentGroups: UrgentGroup[] = [];
  for (const assignmentGroup of assignmentGroups) {
    const poolState = poolStates.get(assignmentGroup.groupId);
    if (!poolState) continue;

    const hasWork = poolState.poolRemaining > 0 || poolState.overdueAsOfMainDate;
    if (!hasWork) continue;

    if (poolState.overdueAsOfMainDate && assignmentGroup.plannedEnd !== null) {
      urgentGroups.push({
        groupId: assignmentGroup.groupId,
        label: assignmentGroup.label,
        memberServCodeIds: assignmentGroup.servCodeIds,
        reason: { kind: "overdue", deadline: assignmentGroup.plannedEnd },
      });
    } else if (assignmentGroup.plannedEnd === null) {
      urgentGroups.push({
        groupId: assignmentGroup.groupId,
        label: assignmentGroup.label,
        memberServCodeIds: assignmentGroup.servCodeIds,
        reason: { kind: "unplanned" },
      });
    }
  }

  const crawlerDays = buildCrawlerDays({
    mainDate,
    assignmentGroups,
    // Use pastState.poolStates for the present day's poolRemaining — futureState.poolStates
    // has been mutated in-place by the future crawl and reflects post-drain values, not
    // the pool state as of mainDate.
    presentPoolStates: pastState.poolStates,
    breakdownsByGroupByDate: pastState.breakdownsByGroupByDate,
    futureCrawlerDays: futureState.crawlerDays,
    sequences: inputs.sequences,
    servCodes: inputs.servCodes,
  } as Parameters<typeof buildCrawlerDays>[0]);

  return {
    urgentGroups,
    crawlerDays,
  };
}

const COMPLETED_STATUSES_ASSEMBLE = new Set(getServiceStatuses(["completed"]));

function buildCrawlerDays({
  mainDate,
  assignmentGroups,
  presentPoolStates,
  breakdownsByGroupByDate,
  futureCrawlerDays,
  sequences,
  servCodes,
}: {
  mainDate: string;
  assignmentGroups: AssignmentGroup[];
  presentPoolStates: Map<string, import("@/app/pace/lib/PaceEngineTypes").GroupPoolState>;
  breakdownsByGroupByDate: Map<string, Map<string, { employeeId: string; priceCompleted: number; priceForecasted: number }[]>>;
  futureCrawlerDays: CrawlerDay[];
  sequences: GroupSequence[];
  servCodes: ServCodeDeep[];
}): CrawlerDay[] {
  const poolStates = presentPoolStates;
  const sequenceIdByGroupId = new Map<string, string | null>();
  for (const sequence of sequences) {
    const isSynthetic = sequence.groupIds.length === 1;
    for (const groupId of sequence.groupIds) {
      sequenceIdByGroupId.set(groupId, isSynthetic ? null : sequence.sequenceId);
    }
  }

  const labelByGroupId = new Map<string, string>();
  for (const ag of assignmentGroups) {
    labelByGroupId.set(ag.groupId, ag.label);
  }

  // ---------------------------------------------------------------------------
  // Build DaysSince constraint context for past/present phases.
  //
  // For each constrained sequence (daysSince > 0), we need:
  //   1. servCodeToGroupId — which group each servCode belongs to
  //   2. Per-program predecessor completion timeline — Map<progId, doneDate[]> sorted asc
  //      so we can answer "what was the latest predecessor doneDate as of day D?"
  //   3. Per-program successor service list — all active/completed successor services
  //      with their doneDates (null if not yet completed as of mainDate)
  // ---------------------------------------------------------------------------

  // Build servCodeToGroupId
  const servCodeToGroupId = new Map<string, string>();
  for (const ag of assignmentGroups) {
    for (const servCodeId of ag.servCodeIds) {
      servCodeToGroupId.set(servCodeId, ag.groupId);
    }
  }

  // Constrained sequences only
  const constrainedSequences = sequences.filter((s) => s.daysSince > 0 && s.groupIds.length > 1);

  // For each constrained sequence, build:
  //   predecessorDoneDatesByProgId: Map<progId, string[]> — sorted asc completion dates for predecessor group
  //   successorServicesByProgId: Map<progId, { doneDate: string | null }> — successor services
  type ConstraintContext = {
    daysSince: number;
    successorGroupId: string;
    // Map<progId, sorted asc list of predecessor completion dates>
    predecessorDoneDatesByProgId: Map<number, string[]>;
    // Map<progId, doneDate | null> — null means not yet completed as of mainDate
    successorDoneDateByProgId: Map<number, string | null>;
  };

  const constraintContextBySuccessorGroupId = new Map<string, ConstraintContext>();

  for (const sequence of constrainedSequences) {
    const { daysSince, groupIds } = sequence;
    for (let i = 1; i < groupIds.length; i++) {
      const successorGroupId = groupIds[i]!;
      const predecessorGroupId = groupIds[i - 1]!;

      const predecessorDoneDatesByProgId = new Map<number, string[]>();
      const successorDoneDateByProgId = new Map<number, string | null>();

      for (const servCode of servCodes) {
        const groupId = servCodeToGroupId.get(servCode.servCodeId);
        if (!groupId) continue;

        for (const service of servCode.services) {
          if (service.status === "N") continue;

          if (groupId === predecessorGroupId) {
            if (COMPLETED_STATUSES_ASSEMBLE.has(service.status) && service.production?.doneDate) {
              const doneDate = service.production.doneDate;
              if (doneDate.length >= 10) {
                if (!predecessorDoneDatesByProgId.has(service.progId)) {
                  predecessorDoneDatesByProgId.set(service.progId, []);
                }
                predecessorDoneDatesByProgId.get(service.progId)!.push(doneDate);
              }
            }
          } else if (groupId === successorGroupId) {
            if (!successorDoneDateByProgId.has(service.progId)) {
              // Use the doneDate if completed, null otherwise
              const doneDate = COMPLETED_STATUSES_ASSEMBLE.has(service.status) && service.production?.doneDate
                ? service.production.doneDate
                : null;
              successorDoneDateByProgId.set(service.progId, doneDate);
            }
          }
        }
      }

      // Sort predecessor doneDates ascending for each progId
      for (const dates of predecessorDoneDatesByProgId.values()) {
        dates.sort();
      }

      constraintContextBySuccessorGroupId.set(successorGroupId, {
        daysSince,
        successorGroupId,
        predecessorDoneDatesByProgId,
        successorDoneDateByProgId,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Collect all past production dates (strictly before mainDate)
  // ---------------------------------------------------------------------------

  const allPastDates = new Set<string>();
  for (const byDate of breakdownsByGroupByDate.values()) {
    for (const date of byDate.keys()) {
      if (date < mainDate) allPastDates.add(date);
    }
  }

  // Cumulative priceCompleted per employee per group, accumulated as we walk past dates in order.
  const pastEmpCumulativeByGroup = new Map<string, Map<string, number>>();

  const sortedPastDates = [...allPastDates].sort();
  const pastDays: CrawlerDay[] = sortedPastDates.map((date): CrawlerDay => {
    const groups: CrawlerDayGroup[] = [];
    for (const [groupId, byDate] of breakdownsByGroupByDate) {
      const dayBreakdowns = byDate.get(date);
      if (!dayBreakdowns || dayBreakdowns.length === 0) continue;

      const poolState = poolStates.get(groupId);
      const totalPool = poolState?.totalPool ?? 0;

      // Accumulate cumulative per-employee totals for this group on this date
      if (!pastEmpCumulativeByGroup.has(groupId)) {
        pastEmpCumulativeByGroup.set(groupId, new Map());
      }
      const empCumulative = pastEmpCumulativeByGroup.get(groupId)!;
      for (const bd of dayBreakdowns) {
        empCumulative.set(bd.employeeId, (empCumulative.get(bd.employeeId) ?? 0) + bd.priceCompleted);
      }

      // Derive poolCompletedSoFar by summing all employee cumulative totals for this group
      const poolCompletedSoFar = [...empCumulative.values()].reduce((sum, v) => sum + v, 0);
      const poolRemaining = Math.max(0, totalPool - poolCompletedSoFar);
      const priceCompleted = dayBreakdowns.reduce((sum, bd) => sum + bd.priceCompleted, 0);

      const daysSinceAnalysis = computeHistoricalDaysSinceAnalysis(groupId, date, constraintContextBySuccessorGroupId);

      groups.push({
        groupId,
        label: labelByGroupId.get(groupId) ?? groupId,
        sequenceId: sequenceIdByGroupId.get(groupId) ?? null,
        poolCompletedSoFar,
        poolRemaining,
        priceCompleted,
        priceForecasted: 0,
        percentCompleted: totalPool > 0 ? poolCompletedSoFar / totalPool : 0,
        totalPool,
        cascadedToSuccessor: false,
        employees: dayBreakdowns.map((bd) => ({
          employeeId: bd.employeeId,
          priceCompleted: bd.priceCompleted,
          priceForecasted: 0,
          priceCompletedSoFar: empCumulative.get(bd.employeeId) ?? bd.priceCompleted,
        })),
        daysSinceAnalysis: daysSinceAnalysis ?? undefined,
      });
    }
    return { date, phase: "past", groups };
  }).filter((day) => day.groups.length > 0);

  // Build present CrawlerDay (mainDate).
  // Uses mainDate completions from breakdownsByGroupByDate (doneDate === mainDate)
  // for priceCompleted and employee attribution. poolRemaining comes from poolStates
  // (active pool already accounts for completed-today services being removed from the pool).
  const presentEmpCumulativeByGroup = new Map<string, Map<string, number>>();

  // Seed present cumulative from past cumulative so priceCompletedSoFar is correct
  for (const [groupId, empMap] of pastEmpCumulativeByGroup) {
    presentEmpCumulativeByGroup.set(groupId, new Map(empMap));
  }

  const presentGroups: CrawlerDayGroup[] = [];
  for (const ag of assignmentGroups) {
    const poolState = poolStates.get(ag.groupId);
    if (!poolState) continue;

    const mainDateBreakdowns = breakdownsByGroupByDate.get(ag.groupId)?.get(mainDate) ?? [];
    const hasMainDateWork = mainDateBreakdowns.length > 0;
    const hasRemainingPool = poolState.poolRemaining > 0;

    // Include this group in the present day if it has work completed today OR has remaining pool
    if (!hasMainDateWork && !hasRemainingPool) continue;

    if (!presentEmpCumulativeByGroup.has(ag.groupId)) {
      presentEmpCumulativeByGroup.set(ag.groupId, new Map());
    }
    const empCumulative = presentEmpCumulativeByGroup.get(ag.groupId)!;
    for (const bd of mainDateBreakdowns) {
      empCumulative.set(bd.employeeId, (empCumulative.get(bd.employeeId) ?? 0) + bd.priceCompleted);
    }

    const priceCompleted = mainDateBreakdowns.reduce((sum, bd) => sum + bd.priceCompleted, 0);
    const poolCompletedSoFar = poolState.completedSoFar;

    const daysSinceAnalysis = computeHistoricalDaysSinceAnalysis(ag.groupId, mainDate, constraintContextBySuccessorGroupId);

    presentGroups.push({
      groupId: ag.groupId,
      label: ag.label,
      sequenceId: sequenceIdByGroupId.get(ag.groupId) ?? null,
      poolCompletedSoFar,
      poolRemaining: poolState.poolRemaining,
      priceCompleted,
      priceForecasted: 0,
      percentCompleted: poolState.totalPool > 0 ? poolCompletedSoFar / poolState.totalPool : 0,
      totalPool: poolState.totalPool,
      cascadedToSuccessor: false,
      employees: mainDateBreakdowns.map((bd) => ({
        employeeId: bd.employeeId,
        priceCompleted: bd.priceCompleted,
        priceForecasted: 0,
        priceCompletedSoFar: empCumulative.get(bd.employeeId) ?? bd.priceCompleted,
      })),
      daysSinceAnalysis: daysSinceAnalysis ?? undefined,
    });
  }

  const presentDay: CrawlerDay[] = presentGroups.length > 0
    ? [{ date: mainDate, phase: "present", groups: presentGroups }]
    : [];

  return [...pastDays, ...presentDay, ...futureCrawlerDays];
}

// ---------------------------------------------------------------------------
// computeHistoricalDaysSinceAnalysis
// ---------------------------------------------------------------------------

/**
 * Computes DaysSinceAnalysis for a constrained successor group on a historical date
 * (past or present phase).
 *
 * For each successor service, we determine what the constraint state was as of `date`:
 *   - The effective predecessor doneDate = the latest predecessor completion for this
 *     program that occurred on or before `date`.
 *   - elapsedDays = date - effectivePredecessorDoneDate
 *
 * Services are classified as:
 *   - worked on `date` (doneDate === date): contribute to `availableElapsedDays`
 *     (how long they waited before being scheduled)
 *   - not yet worked as of `date` (doneDate > date or null), predecessor done:
 *     - elapsedDays >= daysSince → was available (backlog — eligible but not yet scheduled)
 *     - elapsedDays < daysSince → locked (not yet eligible)
 *   - predecessor not done as of `date`: countPredecessorNotDone
 *
 * `countAvailable` = services eligible to schedule as of `date` (not yet worked + elapsedDays >= daysSince)
 *   plus services worked on `date` (they were available when scheduled).
 *
 * Returns null for groups that are not constrained successors.
 */
type ConstraintContext = {
  daysSince: number;
  successorGroupId: string;
  predecessorDoneDatesByProgId: Map<number, string[]>;
  successorDoneDateByProgId: Map<number, string | null>;
};

function computeHistoricalDaysSinceAnalysis(
  groupId: string,
  date: string,
  constraintContextBySuccessorGroupId: Map<string, ConstraintContext>,
): DaysSinceAnalysis | null {
  const ctx = constraintContextBySuccessorGroupId.get(groupId);
  if (!ctx) return null;

  const { daysSince, predecessorDoneDatesByProgId, successorDoneDateByProgId } = ctx;

  const availableElapsed: number[] = [];
  const lockedDaysUntilUnlock: number[] = [];
  let countAvailable = 0;
  let countLocked = 0;
  let countPredecessorNotDone = 0;

  for (const [progId, successorDoneDate] of successorDoneDateByProgId) {
    // Services already completed as of `date` are consumed — not in the pool anymore.
    // They don't belong in any bucket (available, locked, or pending).
    if (successorDoneDate !== null && successorDoneDate <= date) continue;

    // Find the latest predecessor doneDate for this program as of `date`
    const predDates = predecessorDoneDatesByProgId.get(progId);
    const effectivePredDoneDate = predDates
      ? latestDateOnOrBefore(predDates, date)
      : null;

    if (effectivePredDoneDate === null) {
      // Predecessor not yet done as of this date
      countPredecessorNotDone++;
      continue;
    }

    const elapsed = calendarDaysBetweenAssemble(effectivePredDoneDate, date);

    if (elapsed >= daysSince) {
      // Eligible to schedule — available backlog
      availableElapsed.push(elapsed);
      countAvailable++;
    } else {
      // Predecessor done but daysSince not yet elapsed — still locked
      lockedDaysUntilUnlock.push(daysSince - elapsed);
      countLocked++;
    }
  }

  const sortedAvailable = [...availableElapsed].sort((a, b) => a - b);
  const sortedLocked = [...lockedDaysUntilUnlock].sort((a, b) => a - b);

  return {
    daysSince,
    countAvailable,
    countLocked,
    countPredecessorNotDone,
    availableElapsedDays: buildDistributionAssemble(sortedAvailable),
    lockedDaysUntilUnlock: buildDistributionAssemble(sortedLocked),
  };
}

/**
 * Returns the latest date in a sorted-ascending array that is <= `date`.
 * Returns null if no such date exists.
 */
function latestDateOnOrBefore(sortedDates: string[], date: string): string | null {
  let result: string | null = null;
  for (const d of sortedDates) {
    if (d <= date) result = d;
    else break;
  }
  return result;
}

function buildDistributionAssemble(sorted: number[]): ElapsedDaysDistribution | null {
  if (sorted.length < 4) return null;
  return {
    q1: quartilePercentileAssemble(sorted, 0.25),
    median: quartilePercentileAssemble(sorted, 0.5),
    q3: quartilePercentileAssemble(sorted, 0.75),
  };
}

function quartilePercentileAssemble(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const frac = idx - lo;
  return sorted[lo]! + frac * (sorted[hi]! - sorted[lo]!);
}

function calendarDaysBetweenAssemble(dateA: string, dateB: string): number {
  const msPerDay = 86_400_000;
  return Math.round(
    (new Date(dateB + "T00:00:00").getTime() - new Date(dateA + "T00:00:00").getTime()) / msPerDay,
  );
}
