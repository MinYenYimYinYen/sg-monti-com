import { GroupPoolState } from "@/app/pace/lib/PaceEngineTypes";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { PaceEngineInputs } from "@/app/pace/lib/PaceEngineInputs";
import { GroupSequenceClassifier } from "@/app/pace/lib/groupSequenceClassifier";
import { accumulateActualProduction } from "./helpers/accumulateActualProduction";
import { computeActualGroupRates, GroupProductionStats } from "./helpers/computeActualGroupRates";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

const ACTIVE_STATUSES = new Set(getServiceStatuses(["active", "asap"]));
const COMPLETED_STATUSES = new Set(getServiceStatuses(["completed"]));

type EmployeeProductionEntry = {
  employeeId: string;
  priceCompleted: number;
  priceForecasted: number;
};

export type PastPhaseState = {
  poolStates: Map<string, GroupPoolState>;
  servCodeToGroupId: Map<string, string>;
  groupProductionStats: Map<string, GroupProductionStats>;
  breakdownsByGroupByDate: Map<string, Map<string, EmployeeProductionEntry[]>>;
};

export function crawlPastPhase(
  inputs: PaceEngineInputs,
  assignmentGroups: AssignmentGroup[],
): PastPhaseState {
  const { servCodes, mainDate } = inputs;

  const servCodeToGroupId = new Map<string, string>();
  for (const assignmentGroup of assignmentGroups) {
    for (const servCodeId of assignmentGroup.servCodeIds) {
      servCodeToGroupId.set(servCodeId, assignmentGroup.groupId);
    }
  }

  const activePoolByGroup = new Map<string, number>();
  const totalPoolByGroup = new Map<string, number>();

  for (const servCode of servCodes) {
    const groupId = servCodeToGroupId.get(servCode.servCodeId);
    if (!groupId) continue;

    for (const service of servCode.services) {
      if (service.status === "N") continue;

      totalPoolByGroup.set(groupId, (totalPoolByGroup.get(groupId) ?? 0) + service.price);

      if (ACTIVE_STATUSES.has(service.status) || service.status === "$") {
        activePoolByGroup.set(groupId, (activePoolByGroup.get(groupId) ?? 0) + service.price);
      }
    }
  }

  // Accumulate actual production history (per-employee breakdown).
  // Includes mainDate completions (doneDate === mainDate) so the present CrawlerDay
  // reflects work already done today.
  const productionByGroupByEmployeeByDate = accumulateActualProduction(
    servCodes,
    servCodeToGroupId,
    mainDate,
  );

  // Build per-group, per-date employee breakdowns from doneBys.
  // Includes mainDate (doneDate <= mainDate) so assembleGroupResults can build
  // a present CrawlerDay with real priceCompleted and employee attribution.
  const breakdownsByGroupByDate = new Map<string, Map<string, EmployeeProductionEntry[]>>();

  for (const servCode of servCodes) {
    const groupId = servCodeToGroupId.get(servCode.servCodeId);
    if (!groupId) continue;

    for (const service of servCode.services) {
      if (!COMPLETED_STATUSES.has(service.status) || !service.production) continue;
      const doneDate = service.production.doneDate;
      if (!doneDate || doneDate > mainDate) continue;

      if (!breakdownsByGroupByDate.has(groupId)) {
        breakdownsByGroupByDate.set(groupId, new Map());
      }
      const byDate = breakdownsByGroupByDate.get(groupId)!;
      if (!byDate.has(doneDate)) byDate.set(doneDate, []);
      const dayBreakdowns = byDate.get(doneDate)!;

      const { doneBys } = service.production;
      if (doneBys.length > 0) {
        for (const doneBy of doneBys) {
          if (!doneBy.employeeId) continue;
          const share = service.price * doneBy.percent;
          const existing = dayBreakdowns.find((b) => b.employeeId === doneBy.employeeId);
          if (existing) {
            existing.priceCompleted += share;
          } else {
            dayBreakdowns.push({ employeeId: doneBy.employeeId, priceCompleted: share, priceForecasted: 0 });
          }
        }
      }
    }
  }

  // Include printed services (status "$") scheduled for mainDate in the present day's
  // priceCompleted. These are committed — scheduled and expected to complete today.
  // The pool math already accounts for them (status "$" is in ACTIVE_STATUSES and
  // excluded from the active pool once completed), so this only affects attribution.
  for (const servCode of servCodes) {
    const groupId = servCodeToGroupId.get(servCode.servCodeId);
    if (!groupId) continue;

    for (const service of servCode.services) {
      if (service.status !== "$") continue;
      const schedDate = service.assignments.mostRecent?.schedDate;
      if (schedDate !== mainDate) continue;

      const employeeId = service.assignments.mostRecent?.employeeId ?? "_team";

      if (!breakdownsByGroupByDate.has(groupId)) {
        breakdownsByGroupByDate.set(groupId, new Map());
      }
      const byDate = breakdownsByGroupByDate.get(groupId)!;
      if (!byDate.has(mainDate)) byDate.set(mainDate, []);
      const dayBreakdowns = byDate.get(mainDate)!;

      const existing = dayBreakdowns.find((b) => b.employeeId === employeeId);
      if (existing) {
        existing.priceCompleted += service.price;
      } else {
        dayBreakdowns.push({ employeeId, priceCompleted: service.price, priceForecasted: 0 });
      }
    }
  }

  const groupProductionStats = computeActualGroupRates(productionByGroupByEmployeeByDate);

  const poolStates = new Map<string, GroupPoolState>();

  for (const assignmentGroup of assignmentGroups) {
    const { groupId } = assignmentGroup;
    const activePool = activePoolByGroup.get(groupId) ?? 0;
    const totalPool = totalPoolByGroup.get(groupId) ?? 0;
    const stats = groupProductionStats.get(groupId);

    // Determine projectedEndDate for groups already fully drained as of mainDate.
    // Walk production dates in order, accumulating until we reach totalPool.
    let pastProjectedEndDate: string | null = null;
    if (activePool === 0 && totalPool > 0) {
      const byEmployeeByDate = productionByGroupByEmployeeByDate.get(groupId);
      if (byEmployeeByDate) {
        const byDate = new Map<string, number>();
        for (const employeeDates of byEmployeeByDate.values()) {
          for (const [date, price] of employeeDates) {
            byDate.set(date, (byDate.get(date) ?? 0) + price);
          }
        }
        let cumulative = 0;
        for (const date of [...byDate.keys()].sort()) {
          cumulative += byDate.get(date)!;
          if (cumulative >= totalPool) {
            pastProjectedEndDate = date;
            break;
          }
        }
        if (!pastProjectedEndDate) pastProjectedEndDate = mainDate;
      }
    }

    poolStates.set(groupId, {
      groupId,
      poolRemaining: activePool,
      totalPool,
      completedSoFar: totalPool - activePool,
      productionDays: stats?.actualDaysWorked ?? 0,
      productionSum: stats?.actualPriceCompleted ?? 0,
      projectedEndDate: pastProjectedEndDate,
      projectedStartDate: null,
      overdueAsOfMainDate:
        assignmentGroup.plannedEnd !== null && assignmentGroup.plannedEnd < mainDate && activePool > 0,
    });
  }

  return { poolStates, servCodeToGroupId, groupProductionStats, breakdownsByGroupByDate };
}
