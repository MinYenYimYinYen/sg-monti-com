import {
  UrgentGroup,
  PaceEngineResult,
} from "@/app/pace/lib/PaceEngineTypes";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { CrawlerDay, CrawlerDayGroup } from "@/app/pace/lib/crawlerDay/CrawlerDay";
import { PaceEngineInputs } from "@/app/pace/lib/PaceEngineInputs";
import { FuturePhaseState } from "@/app/pace/lib/crawlFuturePhase/crawlFuturePhase";
import { PastPhaseState } from "@/app/pace/lib/crawlPastPhase/crawlPastPhase";

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
    poolStates,
    breakdownsByGroupByDate: pastState.breakdownsByGroupByDate,
    futureCrawlerDays: futureState.crawlerDays,
    sequences: inputs.sequences,
  });

  return {
    urgentGroups,
    crawlerDays,
  };
}

function buildCrawlerDays({
  mainDate,
  assignmentGroups,
  poolStates,
  breakdownsByGroupByDate,
  futureCrawlerDays,
  sequences,
}: {
  mainDate: string;
  assignmentGroups: AssignmentGroup[];
  poolStates: Map<string, import("@/app/pace/lib/PaceEngineTypes").GroupPoolState>;
  breakdownsByGroupByDate: Map<string, Map<string, { employeeId: string; priceCompleted: number; priceForecasted: number }[]>>;
  futureCrawlerDays: CrawlerDay[];
  sequences: import("@/app/pace/groupSequence/GroupSequenceTypes").GroupSequence[];
}): CrawlerDay[] {
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

  // Collect all past production dates (strictly before mainDate)
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
    });
  }

  const presentDay: CrawlerDay[] = presentGroups.length > 0
    ? [{ date: mainDate, phase: "present", groups: presentGroups }]
    : [];

  return [...pastDays, ...presentDay, ...futureCrawlerDays];
}
